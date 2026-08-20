import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeStatusDto } from './dto/employee.dto';
import { AuditAction, EmployeeStatus, UserRole } from '@prisma/client';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string, filters: { status?: EmployeeStatus; departmentId?: string; search?: string }) {
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { cpf: { contains: filters.search.replace(/\D/g, '') } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { registration: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        schedule: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, active: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        department: true,
        schedule: true,
        locations: { include: { location: true } },
        user: { select: { id: true, email: true, active: true, lastLoginAt: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException('Funcionário não encontrado');
    }

    return employee;
  }

  async findByUserId(userId: string) {
    return this.prisma.employee.findUnique({
      where: { userId },
      include: { tenant: true, schedule: true, department: true },
    });
  }

  async create(tenantId: string, dto: CreateEmployeeDto, actorUserId: string) {
    // Valida duplicidade
    const existing = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        OR: [{ cpf: dto.cpf.replace(/\D/g, '') }, { email: dto.email.toLowerCase() }],
      },
    });

    if (existing) {
      throw new ConflictException('Já existe funcionário com este CPF ou email');
    }

    // Cria user + employee em transação
    const result = await this.prisma.$transaction(async (tx) => {
      const password = dto.password || Math.random().toString(36).slice(-10);
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          role: UserRole.EMPLOYEE,
          active: true,
          tenantId,
        },
      });

      const employee = await tx.employee.create({
        data: {
          tenantId,
          userId: user.id,
          name: dto.name,
          cpf: dto.cpf.replace(/\D/g, ''),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone,
          registration: dto.registration,
          position: dto.position,
          departmentId: dto.departmentId,
          scheduleId: dto.scheduleId,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : new Date(),
          status: EmployeeStatus.ACTIVE,
        },
        include: { department: true, schedule: true },
      });

      // Cria bank hour zerado
      await tx.bankHour.create({
        data: { tenantId, employeeId: employee.id, balanceMinutes: 0 },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.CREATE,
          entity: 'Employee',
          entityId: employee.id,
          newValue: { name: employee.name, email: employee.email },
        },
      });

      return { employee, generatedPassword: password };
    });

    // Nunca retorna a senha na response padrão
    this.logger.log(`Funcionário criado: ${result.employee.id} (tenant: ${tenantId})`);

    return {
      employee: result.employee,
      ...(dto.password ? {} : { generatedPassword: result.generatedPassword }),
    };
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto, actorUserId: string) {
    const existing = await this.findById(tenantId, id);
    const oldValue = { ...existing };

    const updated = await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email?.toLowerCase().trim(),
          phone: dto.phone,
          position: dto.position,
          departmentId: dto.departmentId,
          scheduleId: dto.scheduleId,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
          terminationDate: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
        },
        include: { department: true, schedule: true },
      });

      if (dto.email && dto.email !== existing.email) {
        await tx.user.update({
          where: { id: existing.user!.id },
          data: { email: dto.email.toLowerCase().trim() },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.UPDATE,
          entity: 'Employee',
          entityId: id,
          oldValue: this.diff(oldValue, existing),
          newValue: this.diff(oldValue, employee),
        },
      });

      return employee;
    });

    return updated;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateEmployeeStatusDto, actorUserId: string) {
    const existing = await this.findById(tenantId, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: { status: dto.status },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.EMPLOYEE_CHANGE,
          entity: 'Employee',
          entityId: id,
          oldValue: { status: existing.status },
          newValue: { status: dto.status },
        },
      });

      return employee;
    });

    return updated;
  }

  private diff<T extends Record<string, unknown>>(a: T, b: T): Record<string, { from: unknown; to: unknown }> {
    const out: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(b)) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        out[key] = { from: a[key], to: b[key] };
      }
    }
    return out;
  }
}
