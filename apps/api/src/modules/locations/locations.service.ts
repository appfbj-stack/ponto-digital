import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/location.dto';
import { AuditAction } from '@prisma/client';
import { isValidLatLng } from '@kairos/utils';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.workLocation.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const loc = await this.prisma.workLocation.findFirst({ where: { id, tenantId } });
    if (!loc) throw new NotFoundException('Local não encontrado');
    return loc;
  }

  async create(tenantId: string, dto: CreateLocationDto, actorUserId: string) {
    if (!isValidLatLng(dto.latitude, dto.longitude)) {
      throw new ConflictException('Coordenadas inválidas');
    }

    const existing = await this.prisma.workLocation.findFirst({
      where: { tenantId, name: dto.name },
    });
    if (existing) throw new ConflictException('Já existe local com este nome');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.workLocation.create({
        data: {
          tenantId,
          name: dto.name,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          radiusMeters: dto.radiusMeters,
          active: dto.active ?? true,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.CREATE,
          entity: 'WorkLocation',
          entityId: created.id,
          newValue: { name: dto.name, radius: dto.radiusMeters },
        },
      });
      return created;
    });
  }

  async update(tenantId: string, id: string, dto: CreateLocationDto, actorUserId: string) {
    if (!isValidLatLng(dto.latitude, dto.longitude)) {
      throw new ConflictException('Coordenadas inválidas');
    }

    const existing = await this.findById(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.workLocation.update({
        where: { id },
        data: {
          name: dto.name,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          radiusMeters: dto.radiusMeters,
          active: dto.active ?? true,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.LOCATION_CHANGE,
          entity: 'WorkLocation',
          entityId: id,
          oldValue: { name: existing.name, radius: existing.radiusMeters },
          newValue: { name: dto.name, radius: dto.radiusMeters },
        },
      });
      return updated;
    });
  }
}
