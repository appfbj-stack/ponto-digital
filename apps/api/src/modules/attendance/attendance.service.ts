import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BiometricService } from '../biometric/biometric.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterAttendanceDto } from './dto/register-attendance.dto';
import { AttendanceType, AttendanceStatus, AuditAction } from '@prisma/client';
import { distanceInMeters, isAccuracyAcceptable, isValidLatLng } from '@kairos/utils';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly biometric: BiometricService,
    private readonly timesheet: TimesheetService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Registra um ponto. Fluxo:
   * 1. Valida idempotência (clientEventId)
   * 2. Busca funcionário + jornada
   * 3. Valida localização (geocerca)
   * 4. Valida face (delegado para o provider — mock nesta Etapa 1)
   * 5. Persiste com timestamp do SERVIDOR (autoritativo)
   * 6. Audit log
   */
  async register(
    tenantId: string,
    employeeId: string,
    dto: RegisterAttendanceDto,
    ip?: string,
    userAgent?: string,
  ) {
    // 1. Idempotência
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { clientEventId: dto.clientEventId },
    });
    if (existing) {
      this.logger.log(`Registro duplicado (idempotente): ${dto.clientEventId}`);
      return this.toResponse(existing);
    }

    // 2. Buscar funcionário
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { schedule: true, tenant: true },
    });
    if (!employee) {
      throw new BadRequestException('Funcionário não encontrado');
    }
    if (employee.status !== 'ACTIVE') {
      throw new ForbiddenException('Funcionário não está ativo');
    }

    // 3. Validação de geolocalização
    if (!isValidLatLng(dto.latitude, dto.longitude)) {
      throw new BadRequestException('Coordenadas inválidas');
    }
    if (!isAccuracyAcceptable(dto.accuracy, 200)) {
      throw new BadRequestException(
        'Precisão da localização insuficiente. Tente em ambiente aberto.',
      );
    }

    // Verifica geocerca
    const geofenceResult = await this.checkGeofence(tenantId, dto.latitude, dto.longitude);

    if (!geofenceResult.allowed) {
      if (employee.tenant.outOfRadiusBehavior === 'BLOCK') {
        throw new ForbiddenException({
          message: 'Você está fora do local autorizado para registro de ponto.',
          error: 'OUT_OF_GEOFENCE',
          details: {
            distanceMeters: geofenceResult.distance,
            nearestLocation: geofenceResult.nearestLocation,
          },
        });
      }
      // ALLOW_WITH_OCCURRENCE — segue mas marca
    }

    // 4. Validação facial via BiometricService
    let faceVerified = false;
    let faceConfidence = 0;
    let faceDistance: number | undefined;
    try {
      // Embedding e liveness são parseadas do faceToken (que agora é JSON)
      let embeddingData: { embedding: number[]; modelVersion: string; quality: number };
      let livenessData: { confidence: number; checks: any };
      try {
        const parsed = JSON.parse(dto.faceToken);
        embeddingData = parsed.embedding;
        livenessData = parsed.liveness;
        if (!embeddingData?.embedding || !livenessData?.checks) {
          throw new Error('invalid structure');
        }
      } catch {
        throw new ForbiddenException({
          message: 'Dados de validação facial inválidos.',
          error: 'FACE_PAYLOAD_INVALID',
        });
      }

      const verifyResult = await this.biometric.verify(tenantId, employeeId, {
        embedding: embeddingData,
        liveness: livenessData,
        deviceId: dto.deviceId,
      });

      if (!verifyResult.matched) {
        throw new ForbiddenException({
          message: 'Rosto não confere com a biometria cadastrada. Tente novamente.',
          error: 'FACE_NOT_MATCHED',
          details: {
            distance: verifyResult.distance,
            threshold: verifyResult.threshold,
            confidence: verifyResult.confidence,
          },
        });
      }

      faceVerified = true;
      faceConfidence = verifyResult.confidence;
      faceDistance = verifyResult.distance;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      this.logger.error(`Erro na verificação facial: ${err}`);
      throw new ForbiddenException({
        message: 'Não foi possível validar o rosto. Tente novamente.',
        error: 'FACE_VERIFICATION_ERROR',
      });
    }

    // 5. Persistir
    const serverTimestamp = new Date();
    // Status: SYNCED se tem clientTimestamp (envio normal), PENDING se for apenas metadata
    const status = dto.clientTimestamp ? AttendanceStatus.SYNCED : AttendanceStatus.PENDING;

    const record = await this.prisma.$transaction(async (tx) => {
      const created = await tx.attendanceRecord.create({
        data: {
          tenantId,
          employeeId,
          type: dto.type,
          status,
          timestamp: serverTimestamp,
          clientTimestamp: new Date(dto.clientTimestamp),
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracy: dto.accuracy,
          locationId: geofenceResult.matchedLocationId,
          inGeofence: geofenceResult.allowed,
          geofenceDistanceMeters: geofenceResult.distance,
          faceValidated: faceVerified,
          faceConfidence,
          faceLivenessPassed: true,
          deviceId: undefined, // set depois
          ip: ip || null,
          userAgent: userAgent || null,
          clientEventId: dto.clientEventId,
          source: 'ONLINE',
        },
      });

      // Garante/atualiza device
      const device = await tx.device.upsert({
        where: { employeeId_deviceId: { employeeId, deviceId: dto.deviceId } },
        create: {
          tenantId,
          employeeId,
          deviceId: dto.deviceId,
          deviceName: this.extractDeviceName(userAgent),
          platform: this.extractPlatform(userAgent),
          appVersion: null,
          userAgent: userAgent || null,
          active: true,
          lastSeenAt: new Date(),
        },
        update: {
          lastSeenAt: new Date(),
          userAgent: userAgent || null,
        },
      });

      await tx.attendanceRecord.update({
        where: { id: created.id },
        data: { deviceId: device.id },
      });

      // Audit
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: employee.userId || null,
          action: AuditAction.ATTENDANCE_REGISTER,
          entity: 'AttendanceRecord',
          entityId: created.id,
          newValue: {
            type: dto.type,
            timestamp: serverTimestamp.toISOString(),
            inGeofence: geofenceResult.allowed,
          },
          ip: ip || null,
          userAgent: userAgent || null,
        },
      });

      return { ...created, deviceId: device.id };
    });

    this.logger.log(
      `Ponto registrado: ${record.id} (${dto.type}) para funcionário ${employeeId}`,
    );

    // Recalcula banco de horas em background (não bloqueia a response)
    this.timesheet.recalculateBankHours(tenantId, employeeId).catch((err) => {
      this.logger.error(`Erro ao recalcular bank hours após registro: ${err}`);
    });

    // Detecta atraso na primeira entrada do dia (background, não bloqueia)
    if (dto.type === AttendanceType.ENTRY) {
      this.checkLateArrival(tenantId, employeeId, new Date()).catch((err) => {
        this.logger.error(`Erro ao detectar atraso: ${err}`);
      });
    }

    return this.toResponse(record);
  }

  /**
   * Detecta atraso na primeira entrada do dia.
   * Compara o horário da ENTRY com o start da jornada esperada (do weeklyHours).
   */
  private async checkLateArrival(tenantId: string, employeeId: string, now: Date): Promise<void> {
    // Pega a jornada ativa do funcionário
    const assignment = await this.prisma.scheduleAssignment.findFirst({
      where: {
        employeeId,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: { schedule: true },
      orderBy: { startDate: 'desc' },
    });

    if (!assignment) return;

    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const todayRecords = await this.prisma.attendanceRecord.findMany({
      where: { tenantId, employeeId, timestamp: { gte: today } },
      orderBy: { timestamp: 'asc' },
    });

    // Só notifica no primeiro ponto do dia
    if (todayRecords.length !== 1) return;

    // weeklyHours é JSON: { monday: { entry: "08:00", exit: "17:00", breakStart, breakEnd }, ... }
    const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const weekday = weekdayKeys[now.getDay()] ?? 'sunday';

    const weeklyHours = (assignment.schedule.weeklyHours as Record<string, any>) || {};
    const day = weeklyHours[weekday];
    if (!day || !day.entry) return;

    const [hh, mm] = day.entry.split(':').map(Number);
    if (hh === undefined || mm === undefined) return;
    const expected = new Date(now);
    expected.setHours(hh, mm, 0, 0);

    const diffMs = now.getTime() - expected.getTime();
    const diffMin = Math.round(diffMs / 60000);

    // Tolerância de 5 minutos (config do schedule)
    const tolerance = assignment.schedule.entryToleranceMinutes || 10;
    if (diffMin > tolerance) {
      await this.notifications.late(employeeId, diffMin);
    }
  }

  /**
   * Lista registros de ponto do funcionário logado.
   */
  async myRecords(tenantId: string, employeeId: string, startDate: Date, endDate: Date) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: startDate, lte: endDate },
      },
      include: { location: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Lista todos os registros de ponto da empresa (admin).
   */
  async companyRecords(
    tenantId: string,
    filters: { employeeId?: string; startDate?: Date; endDate?: Date; type?: AttendanceType },
  ) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.startDate || filters.endDate
          ? { timestamp: { gte: filters.startDate, lte: filters.endDate } }
          : {}),
      },
      include: {
        employee: { select: { id: true, name: true, cpf: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
    });
  }

  // --- private ---

  private async checkGeofence(tenantId: string, lat: number, lng: number) {
    const locations = await this.prisma.workLocation.findMany({
      where: { tenantId, active: true },
    });

    if (locations.length === 0) {
      // Sem locais cadastrados: permite (modo permissivo)
      return { allowed: true, distance: 0, matchedLocationId: null, nearestLocation: null };
    }

    let nearest: { id: string; name: string; distance: number } | null = null;
    let matchedLocationId: string | null = null;

    for (const loc of locations) {
      const dist = distanceInMeters(
        { latitude: lat, longitude: lng },
        { latitude: Number(loc.latitude), longitude: Number(loc.longitude) },
      );
      if (!nearest || dist < nearest.distance) {
        nearest = { id: loc.id, name: loc.name, distance: dist };
      }
      if (dist <= loc.radiusMeters) {
        matchedLocationId = loc.id;
        return { allowed: true, distance: dist, matchedLocationId: loc.id, nearestLocation: loc.name };
      }
    }

    return {
      allowed: false,
      distance: nearest?.distance ?? 0,
      matchedLocationId: null,
      nearestLocation: nearest?.name ?? null,
    };
  }

  private toResponse(record: any) {
    return {
      record: {
        id: record.id,
        employeeId: record.employeeId,
        type: record.type,
        status: record.status,
        timestamp: record.timestamp,
        clientTimestamp: record.clientTimestamp,
        latitude: record.latitude ? Number(record.latitude) : undefined,
        longitude: record.longitude ? Number(record.longitude) : undefined,
        accuracy: record.accuracy,
        locationId: record.locationId,
        inGeofence: record.inGeofence,
        geofenceDistanceMeters: record.geofenceDistanceMeters,
        faceValidated: record.faceValidated,
        faceConfidence: record.faceConfidence,
        faceLivenessPassed: record.faceLivenessPassed,
        deviceId: record.deviceId,
        source: record.source,
        clientEventId: record.clientEventId,
      },
    };
  }

  private extractDeviceName(ua?: string): string {
    if (!ua) return 'Desconhecido';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    return 'Web';
  }

  private extractPlatform(ua?: string): string {
    if (!ua) return 'unknown';
    if (/iPhone|iPad|iOS/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'web';
  }
}
