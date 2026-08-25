import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AuditAction, SubscriptionStatus, PlanTier } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  /**
   * Dashboard da plataforma: totais e métricas.
   */
  async getPlatformDashboard() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalTenants,
      activeTenants,
      blockedTenants,
      totalUsers,
      totalEmployees,
      totalTodayRecords,
      activeSubscriptions,
      trialSubscriptions,
      overdueSubscriptions,
      newTenantsThisMonth,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { active: true } }),
      this.prisma.tenant.count({ where: { active: false } }),
      this.prisma.user.count(),
      this.prisma.employee.count(),
      this.prisma.attendanceRecord.count({
        where: { timestamp: { gte: startOfDay } },
      }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.TRIAL } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.OVERDUE } }),
      this.prisma.tenant.count({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
    ]);

    // MRR (Monthly Recurring Revenue) baseado em assinaturas ativas
    const activeSubs = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: { plan: true },
    });
    const mrr = activeSubs.reduce((sum, sub) => sum + Number(sub.plan.priceMonthly), 0);

    // Crescimento mensal de tenants
    const last6Months = await this.getTenantGrowth();

    return {
      totalTenants,
      activeTenants,
      blockedTenants,
      totalUsers,
      totalEmployees,
      totalTodayRecords,
      activeSubscriptions,
      trialSubscriptions,
      overdueSubscriptions,
      newTenantsThisMonth,
      mrr,
      tenantGrowth: last6Months,
    };
  }

  /**
   * Lista todas as empresas com filtros.
   */
  async listTenants(filters: { status?: string; search?: string }) {
    return this.prisma.tenant.findMany({
      where: {
        ...(filters.status === 'active' ? { active: true } : {}),
        ...(filters.status === 'blocked' ? { active: false } : {}),
        ...(filters.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { slug: { contains: filters.search, mode: 'insensitive' } },
                { cnpj: { contains: filters.search.replace(/\D/g, '') } },
              ],
            }
          : {}),
      },
      include: {
        plan: true,
        subscription: true,
        _count: { select: { users: true, employees: true, workLocations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cria uma nova empresa (tenant) + admin inicial + trial.
   * Operação feita pelo super-admin via painel.
   */
  async createTenant(data: {
    name: string;
    slug: string;
    cnpj?: string;
    planId: string;
    adminEmail: string;
    adminName: string;
    adminPassword: string;
  }, actorUserId: string) {
    const existing = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: data.slug }, { cnpj: data.cnpj?.replace(/\D/g, '') || '_' }] },
    });
    if (existing) {
      throw new ConflictException('Já existe empresa com este slug ou CNPJ');
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(data.adminPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          cnpj: data.cnpj?.replace(/\D/g, ''),
          active: true,
        },
      });

      const adminUser = await tx.user.create({
        data: {
          email: data.adminEmail.toLowerCase().trim(),
          passwordHash,
          role: 'COMPANY_ADMIN',
          active: true,
          emailVerified: true,
          tenantId: tenant.id,
        },
      });

      const employee = await tx.employee.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          name: data.adminName,
          cpf: '00000000000', // placeholder — admin atualiza depois
          email: data.adminEmail.toLowerCase().trim(),
          status: 'ACTIVE',
        },
      });

      await tx.user.update({
        where: { id: adminUser.id },
        data: { employee: { connect: { id: employee.id } } },
      });

      // Audit
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: actorUserId,
          action: AuditAction.CREATE,
          entity: 'Tenant',
          entityId: tenant.id,
          newValue: { name: data.name, slug: data.slug },
        },
      });

      return { tenant, adminUser, employee };
    });

    // Inicia trial (fora da transaction)
    await this.billing.startTrial(result.tenant.id, data.planId, actorUserId);

    return result;
  }

  /**
   * Bloqueia tenant.
   */
  async blockTenant(tenantId: string, reason: string, actorUserId: string) {
    return this.billing.suspend(tenantId, reason, actorUserId);
  }

  /**
   * Desbloqueia tenant.
   */
  async unblockTenant(tenantId: string, actorUserId: string) {
    return this.billing.reactivate(tenantId, actorUserId);
  }

  /**
   * Auditoria global (cross-tenant).
   */
  async getGlobalAuditLog(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tenant: { select: { name: true, slug: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
  }

  // --- private ---

  private async getTenantGrowth() {
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await this.prisma.tenant.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      months.push({
        month: start.toISOString().slice(0, 7),
        count,
      });
    }
    return months;
  }
}
