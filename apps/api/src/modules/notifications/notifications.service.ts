import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';

/**
 * Serviço de notificações.
 * Suporta email (SMTP) e persiste registro no banco.
 * Web Push pode ser adicionado depois (subscription-based).
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;
  private emailEnabled = false;
  private fromAddress: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<string>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.fromAddress = this.config.get<string>('SMTP_FROM') || 'noreply@kairosponto.com.br';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
      this.emailEnabled = true;
      this.logger.log(`✅ SMTP configurado: ${host}:${port}`);
    } else {
      this.logger.warn('⚠️ SMTP não configurado — emails não serão enviados (apenas salvos no banco)');
    }
  }

  /**
   * Cria notificação para um funcionário + envia email (se configurado).
   */
  async notify(
    tenantId: string,
    employeeId: string | null,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // Persiste
    const notif = await this.prisma.notification.create({
      data: {
        tenantId,
        employeeId,
        type,
        title,
        body,
        data: data || {},
      },
    });

    // Email (se funcionário vinculado)
    if (employeeId && this.emailEnabled) {
      try {
        const employee = await this.prisma.employee.findUnique({
          where: { id: employeeId },
          include: { user: { select: { email: true } } },
        });
        if (employee?.user?.email) {
          await this.sendEmail(employee.user.email, title, body);
          await this.prisma.notification.update({
            where: { id: notif.id },
            data: { sentEmail: true, sentAt: new Date() },
          });
        }
      } catch (err) {
        this.logger.error(`Erro ao enviar email: ${err}`);
      }
    }
  }

  /**
   * Notifica admin da empresa.
   */
  async notifyTenantAdmins(
    tenantId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { tenantId, role: 'COMPANY_ADMIN', active: true },
      select: { id: true, email: true },
    });

    for (const admin of admins) {
      await this.notify(tenantId, null, type, title, body, data);
      // Email direto
      if (this.emailEnabled && admin.email) {
        try {
          await this.sendEmail(admin.email, title, body);
        } catch (err) {
          this.logger.error(`Erro ao enviar email admin: ${err}`);
        }
      }
    }
  }

  // --- Eventos pré-prontos ---

  /** "Você esqueceu de registrar seu ponto." */
  async missedPunch(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { tenant: true },
    });
    if (!employee) return;

    await this.notify(
      employee.tenantId,
      employeeId,
      NotificationType.MISSED_PUNCH,
      'Você esqueceu de registrar seu ponto?',
      `Olá ${employee.name.split(' ')[0]}, identificamos que você ainda não registrou um ponto hoje. Por favor, registre assim que possível.`,
      { type: 'MISSED_PUNCH', date: new Date().toISOString() },
    );
  }

  /** "Sua solicitação foi aprovada/rejeitada" */
  async correctionResult(
    employeeId: string,
    type: 'APPROVED' | 'REJECTED',
    notes?: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) return;

    const title = type === 'APPROVED' ? '✓ Solicitação aprovada' : '✗ Solicitação rejeitada';
    const body =
      type === 'APPROVED'
        ? `Sua solicitação de correção de ponto foi aprovada${notes ? `. Notas: ${notes}` : '.'}`
        : `Sua solicitação de correção de ponto foi rejeitada${notes ? `. Motivo: ${notes}` : '.'}`;

    await this.notify(
      employee.tenantId,
      employeeId,
      type === 'APPROVED'
        ? NotificationType.CORRECTION_APPROVED
        : NotificationType.CORRECTION_REJECTED,
      title,
      body,
    );
  }

  /** "Você está atrasado." */
  async late(employeeId: string, minutes: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) return;

    await this.notify(
      employee.tenantId,
      employeeId,
      NotificationType.LATE,
      'Atraso detectado',
      `Identificamos um atraso de ${minutes} minutos no seu registro de hoje.`,
    );
  }

  /** Job noturno: detecta esquecimentos de ponto e notifica */
  async checkMissedPunches(tenantId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        attendanceRecords: {
          where: { timestamp: { gte: startOfDay } },
        },
      },
    });

    for (const emp of employees) {
      // Se não tem NENHUM registro hoje, notifica (só após 10h da manhã)
      if (emp.attendanceRecords.length === 0 && now.getHours() >= 10) {
        // Verifica se já não notificou hoje
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const alreadyNotified = await this.prisma.notification.findFirst({
          where: {
            employeeId: emp.id,
            type: NotificationType.MISSED_PUNCH,
            createdAt: { gte: today },
          },
        });
        if (!alreadyNotified) {
          await this.missedPunch(emp.id);
        }
      }
    }
  }

  // --- private ---

  private async sendEmail(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) return;
    await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      text,
      html: this.renderHtml(subject, text),
    });
  }

  private renderHtml(subject: string, text: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #1e40af; margin: 0 0 16px;">Kairos Ponto</h1>
            <h2 style="font-size: 18px; color: #111; margin: 0 0 12px;">${subject}</h2>
            <p style="color: #333; line-height: 1.6;">${text}</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #999; font-size: 12px;">
              Kairos Ponto — Controle de ponto inteligente<br />
              Você está recebendo este email porque é usuário da plataforma.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}
