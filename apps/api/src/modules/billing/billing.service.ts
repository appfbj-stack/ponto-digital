import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createBillingProvider, type BillingProvider, BillingError } from '@kairos/billing';
import {
  SubscriptionStatus,
  PlanTier,
  AuditAction,
} from '@prisma/client';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private provider!: BillingProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const env = this.config.get<string>('ASAAS_ENV') === 'production' ? 'production' : 'sandbox';
    const providerName = (this.config.get<string>('BILLING_PROVIDER') ||
      (this.config.get<string>('ASAAS_API_KEY') ? 'asaas' : 'mock')) as 'asaas' | 'mock';
    const apiKey = this.config.get<string>('ASAAS_API_KEY') || 'mock-key';
    const webhookSecret = this.config.get<string>('ASAAS_WEBHOOK_SECRET');

    this.provider = createBillingProvider({
      provider: providerName,
      environment: env,
      apiKey,
      webhookSecret,
    });

    this.logger.log(`✅ Billing provider inicializado: ${this.provider.name} (${env})`);
  }

  /**
   * Inicia trial de um tenant recém-criado.
   * Chamado pelo super-admin ao criar empresa, OU automaticamente no signup.
   */
  async startTrial(tenantId: string, planId: string, actorUserId?: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plano não encontrado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    const trialEndsAt = new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000);

    const sub = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      },
      update: {
        planId,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      },
    });

    // Ativa licenças do plano
    await this.syncLicenses(tenantId, plan.features as any);

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId || null,
        action: AuditAction.CREATE,
        entity: 'Subscription',
        entityId: sub.id,
        newValue: { planId, status: 'TRIAL', trialEndsAt },
      },
    });

    return sub;
  }

  /**
   * Assina um plano (cria customer no Asaas + subscription).
   * Chamado pelo admin da empresa quando quiser converter trial → pago.
   */
  async subscribe(tenantId: string, planId: string, cpfCnpj: string, actorUserId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plano não encontrado');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    if (!cpfCnpj) throw new BadRequestException('CPF/CNPJ é obrigatório para assinar');

    // Cria/atualiza customer no Asaas
    const customer = await this.provider.upsertCustomer({
      name: tenant.name,
      email: tenant.name + '@kairos.local', // ideal: pegar do admin
      cpfCnpj,
      externalRef: tenantId,
    });

    // Cria subscription
    const cycle = 'MONTHLY';
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 7); // 7 dias pra primeira cobrança

    const sub = await this.provider.createSubscription({
      customerId: customer.id,
      planValue: Number(plan.priceMonthly),
      cycle,
      nextDueDate: nextDueDate.toISOString().split('T')[0]!,
      description: `Kairos Ponto - Plano ${plan.name}`,
      externalRef: tenantId,
    });

    // Persiste
    const subscription = await this.prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        asaasCustomerId: customer.id,
        asaasSubscriptionId: sub.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextDueDate,
      },
      update: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        asaasCustomerId: customer.id,
        asaasSubscriptionId: sub.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextDueDate,
      },
    });

    // Sincroniza licenças
    await this.syncLicenses(tenantId, plan.features as any);

    // Audit
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        action: AuditAction.PLAN_CHANGE,
        entity: 'Subscription',
        entityId: subscription.id,
        newValue: { planId, status: 'ACTIVE', asaasSubscriptionId: sub.id },
      },
    });

    return subscription;
  }

  /**
   * Cancela assinatura.
   */
  async cancel(tenantId: string, actorUserId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException('Assinatura não encontrada');

    if (sub.asaasSubscriptionId) {
      await this.provider.cancelSubscription(sub.asaasSubscriptionId);
    }

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        action: AuditAction.PLAN_CHANGE,
        entity: 'Subscription',
        entityId: sub.id,
        oldValue: { status: sub.status },
        newValue: { status: 'CANCELLED' },
      },
    });

    return updated;
  }

  /**
   * Suspende tenant (admin manual, ex: inadimplência).
   */
  async suspend(tenantId: string, reason: string, actorUserId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException('Assinatura não encontrada');

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: { status: SubscriptionStatus.SUSPENDED },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { active: false, blockedAt: new Date(), blockedReason: reason },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        action: AuditAction.TENANT_SUSPEND,
        entity: 'Tenant',
        entityId: tenantId,
        newValue: { reason, status: 'SUSPENDED' },
      },
    });

    return updated;
  }

  /**
   * Reativa tenant suspenso.
   */
  async reactivate(tenantId: string, actorUserId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub) throw new NotFoundException('Assinatura não encontrada');

    const updated = await this.prisma.subscription.update({
      where: { tenantId },
      data: { status: SubscriptionStatus.ACTIVE },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { active: true, blockedAt: null, blockedReason: null },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        action: AuditAction.TENANT_UNBLOCK,
        entity: 'Tenant',
        entityId: tenantId,
        newValue: { status: 'ACTIVE' },
      },
    });

    return updated;
  }

  /**
   * Processa evento do webhook do Asaas.
   * Chamado pelo WebhookController.
   */
  async handleWebhook(event: any) {
    this.logger.log(`Webhook recebido: ${event.event}`);

    try {
      if (event.event === 'PAYMENT_RECEIVED' && event.payment) {
        await this.markPaymentReceived(event.payment);
      } else if (event.event === 'PAYMENT_OVERDUE' && event.payment) {
        await this.markPaymentOverdue(event.payment);
      } else if (
        event.event === 'SUBSCRIPTION_INACTIVATED' ||
        event.event === 'SUBSCRIPTION_DELETED'
      ) {
        if (event.subscription) {
          await this.markSubscriptionCancelled(event.subscription.id);
        }
      }
    } catch (err) {
      this.logger.error(`Erro ao processar webhook: ${err}`);
    }
  }

  // --- private ---

  private async markPaymentReceived(payment: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: payment.subscription },
    });
    if (!sub) {
      this.logger.warn(`Subscription não encontrada para pagamento ${payment.id}`);
      return;
    }
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        asaasPaymentId: payment.id,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    this.logger.log(`Pagamento recebido: ${payment.id} (subscription ${sub.id})`);
  }

  private async markPaymentOverdue(payment: any) {
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: payment.subscription },
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.OVERDUE },
    });
    this.logger.warn(`Pagamento vencido: ${payment.id} (subscription ${sub.id})`);
  }

  private async markSubscriptionCancelled(asaasSubId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: { asaasSubscriptionId: asaasSubId },
    });
    if (!sub) return;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });
  }

  /**
   * Sincroniza as licenças do tenant com base nas features do plano.
   */
  private async syncLicenses(tenantId: string, features: Record<string, any>) {
    const licenseMap: Record<string, boolean> = {
      facial_recognition: !!features.facial,
      offline_mode: !!features.offline,
      reports_pdf: !!features.pdf,
      reports_excel: true,
      api_access: !!features.api,
      sso: !!features.sso,
    };

    for (const [feature, enabled] of Object.entries(licenseMap)) {
      await this.prisma.license.upsert({
        where: { tenantId_feature: { tenantId, feature } },
        create: { tenantId, feature, enabled },
        update: { enabled },
      });
    }
  }

  /**
   * Job noturno: verifica trials expirados e subscriptions overdue.
   */
  async checkExpirations() {
    const now = new Date();

    // Trials expirados
    const expiredTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { lt: now },
      },
    });

    for (const sub of expiredTrials) {
      this.logger.log(`Trial expirado: tenant=${sub.tenantId}`);
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.OVERDUE },
      });
      await this.prisma.tenant.update({
        where: { id: sub.tenantId },
        data: { active: false, blockedAt: now, blockedReason: 'Trial expirado' },
      });
    }

    return { expiredTrials: expiredTrials.length };
  }
}
