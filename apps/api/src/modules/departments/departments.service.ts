import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const dept = await this.prisma.department.findFirst({ where: { id, tenantId } });
    if (!dept) throw new NotFoundException('Departamento não encontrado');
    return dept;
  }

  async create(tenantId: string, name: string, description: string | undefined, actorUserId: string) {
    const existing = await this.prisma.department.findFirst({ where: { tenantId, name } });
    if (existing) throw new ConflictException('Já existe departamento com este nome');

    const dept = await this.prisma.$transaction(async (tx) => {
      const created = await tx.department.create({
        data: { tenantId, name, description },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.CREATE,
          entity: 'Department',
          entityId: created.id,
          newValue: { name, description },
        },
      });
      return created;
    });

    return dept;
  }

  async update(tenantId: string, id: string, name: string, description: string | undefined, actorUserId: string) {
    const existing = await this.findById(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id },
        data: { name, description },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.UPDATE,
          entity: 'Department',
          entityId: id,
          oldValue: { name: existing.name, description: existing.description },
          newValue: { name, description },
        },
      });
      return updated;
    });
  }
}
