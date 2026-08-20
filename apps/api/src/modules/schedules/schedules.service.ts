import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/schedule.dto';
import { AuditAction } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.workSchedule.findMany({
      where: { tenantId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const schedule = await this.prisma.workSchedule.findFirst({ where: { id, tenantId } });
    if (!schedule) throw new NotFoundException('Jornada não encontrada');
    return schedule;
  }

  async create(tenantId: string, dto: CreateScheduleDto, actorUserId: string) {
    const existing = await this.prisma.workSchedule.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) throw new ConflictException('Já existe jornada com este nome');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.workSchedule.create({
        data: {
          tenantId,
          name: dto.name,
          scheduleType: dto.scheduleType,
          description: dto.description,
          entryToleranceMinutes: dto.entryToleranceMinutes ?? 10,
          exitToleranceMinutes: dto.exitToleranceMinutes ?? 10,
          weeklyHours: dto.weeklyHours as any,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.CREATE,
          entity: 'WorkSchedule',
          entityId: created.id,
          newValue: { name: dto.name },
        },
      });
      return created;
    });
  }

  async update(tenantId: string, id: string, dto: CreateScheduleDto, actorUserId: string) {
    const existing = await this.findById(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workSchedule.update({
        where: { id },
        data: {
          name: dto.name,
          scheduleType: dto.scheduleType,
          description: dto.description,
          entryToleranceMinutes: dto.entryToleranceMinutes ?? 10,
          exitToleranceMinutes: dto.exitToleranceMinutes ?? 10,
          weeklyHours: dto.weeklyHours as any,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.SCHEDULE_CHANGE,
          entity: 'WorkSchedule',
          entityId: id,
          oldValue: { name: existing.name },
          newValue: { name: dto.name },
        },
      });
      return updated;
    });
  }

  /**
   * Retorna os horários esperados para um dia da semana específico.
   */
  async getExpectedTimesForDate(tenantId: string, scheduleId: string, date: Date): Promise<{
    entry?: string;
    breakStart?: string;
    breakEnd?: string;
    exit?: string;
  } | null> {
    const schedule = await this.findById(tenantId, scheduleId);
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const week = schedule.weeklyHours as Record<string, any>;
    return week?.[dayKey] || null;
  }
}
