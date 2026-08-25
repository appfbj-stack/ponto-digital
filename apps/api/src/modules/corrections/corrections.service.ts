import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimesheetService } from '../timesheet/timesheet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCorrectionDto, ReviewCorrectionDto } from './dto/correction.dto';
import { AuditAction, CorrectionStatus, AttendanceStatus } from '@prisma/client';

@Injectable()
export class CorrectionsService {
  private readonly logger = new Logger(CorrectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timesheet: TimesheetService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    tenantId: string,
    employeeId: string,
    dto: CreateCorrectionDto,
  ) {
    return this.prisma.attendanceCorrection.create({
      data: {
        tenantId,
        employeeId,
        date: new Date(dto.date),
        type: dto.type,
        requestedTime: new Date(dto.requestedTime),
        reason: dto.reason,
        status: CorrectionStatus.PENDING,
      },
    });
  }

  async myRequests(tenantId: string, employeeId: string) {
    return this.prisma.attendanceCorrection.findMany({
      where: { tenantId, employeeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listForCompany(tenantId: string, status?: CorrectionStatus) {
    return this.prisma.attendanceCorrection.findMany({
      where: {
        tenantId,
        ...(status ? { status } : {}),
      },
      include: { employee: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    tenantId: string,
    id: string,
    dto: ReviewCorrectionDto,
    actorUserId: string,
  ) {
    const foundExisting = await this.prisma.attendanceCorrection.findFirst({
      where: { id, tenantId },
    });
    if (!foundExisting) throw new NotFoundException('Solicitação não encontrada');
    if (foundExisting.status !== CorrectionStatus.PENDING) {
      throw new BadRequestException('Solicitação já foi revisada');
    }
    const existing: NonNullable<typeof foundExisting> = foundExisting;

    return this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: dto.status as CorrectionStatus,
          reviewedBy: actorUserId,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes,
        },
      });

      if (dto.status === 'APPROVED') {
        // Cria o registro de ponto "corrigido"
        const correctedRecord = await tx.attendanceRecord.create({
          data: {
            tenantId,
            employeeId: existing.employeeId,
            type: existing.type,
            status: AttendanceStatus.CORRECTED,
            timestamp: existing.requestedTime,
            clientTimestamp: existing.requestedTime,
            faceValidated: false,
            faceLivenessPassed: false,
            source: 'ONLINE',
            clientEventId: `correction-${existing.id}`,
            correctedFromId: existing.id,
          },
        });

        await tx.attendanceCorrection.update({
          where: { id },
          data: { appliedRecordId: correctedRecord.id },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action:
            dto.status === 'APPROVED'
              ? AuditAction.ATTENDANCE_CORRECTION_APPROVE
              : AuditAction.ATTENDANCE_CORRECTION_REJECT,
          entity: 'AttendanceCorrection',
          entityId: id,
          newValue: { status: dto.status, reviewNotes: dto.reviewNotes },
        },
      });

      return reviewed;
    });

    // Recalcula bank hours se aprovado (background)
    if (dto.status === 'APPROVED' && existing) {
      const employeeId: string = existing.employeeId;
      this.timesheet.recalculateBankHours(tenantId, employeeId).catch((err: unknown) => {
        this.logger.error(`Erro ao recalcular bank hours após correção: ${err}`);
      });
    }

    // Notifica o funcionário
    if (existing) {
      const employeeId: string = existing.employeeId;
      this.notifications
        .correctionResult(employeeId, dto.status as 'APPROVED' | 'REJECTED', dto.reviewNotes)
        .catch((err: unknown) => this.logger.error(`Erro ao notificar correção: ${err}`));
    }

    return this.prisma.attendanceCorrection.findUnique({ where: { id } });
  }
}
