import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculatePeriod,
  type PeriodResult,
  type PunchRecord,
  type WeeklySchedule,
} from '@kairos/timesheet';
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';

@Injectable()
export class TimesheetService {
  private readonly logger = new Logger(TimesheetService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula o espelho de ponto de um funcionário em um período.
   */
  async getTimesheet(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    employee: { id: string; name: string };
    period: PeriodResult;
    bankHours: { balanceMinutes: number };
    schedule: { id: string; name: string } | null;
  }> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { schedule: true, bankHours: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    const punches = await this.getPunchesAsRecords(tenantId, employeeId, startDate, endDate);

    const weeklySchedule: WeeklySchedule = (employee.schedule?.weeklyHours as WeeklySchedule) || {};
    const entryTolerance = employee.schedule?.entryToleranceMinutes ?? 10;
    const exitTolerance = employee.schedule?.exitToleranceMinutes ?? 10;

    const period = calculatePeriod(startDate, endDate, weeklySchedule, punches, {
      entryToleranceMinutes: entryTolerance,
      exitToleranceMinutes: exitTolerance,
    });

    return {
      employee: { id: employee.id, name: employee.name },
      period,
      bankHours: { balanceMinutes: employee.bankHours?.balanceMinutes ?? 0 },
      schedule: employee.schedule ? { id: employee.schedule.id, name: employee.schedule.name } : null,
    };
  }

  /**
   * Recalcula o banco de horas de um funcionário (atualiza tabela bank_hours).
   * Chamado após registros de ponto ou aprovações de correção.
   */
  async recalculateBankHours(tenantId: string, employeeId: string): Promise<number> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { schedule: true, bankHours: true },
    });
    if (!employee) throw new NotFoundException('Funcionário não encontrado');

    // Calcula saldo acumulado desde a admissão (ou últimos 12 meses, o que for menor)
    const start = employee.admissionDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = new Date();
    const punches = await this.getPunchesAsRecords(tenantId, employeeId, start, end);
    const weeklySchedule: WeeklySchedule = (employee.schedule?.weeklyHours as WeeklySchedule) || {};
    const entryTolerance = employee.schedule?.entryToleranceMinutes ?? 10;
    const exitTolerance = employee.schedule?.exitToleranceMinutes ?? 10;

    const period = calculatePeriod(start, end, weeklySchedule, punches, {
      entryToleranceMinutes: entryTolerance,
      exitToleranceMinutes: exitTolerance,
    });

    const balanceMinutes = period.totals.balanceMinutes;
    const lastCalculatedAt = new Date();

    // Upsert
    if (employee.bankHours) {
      await this.prisma.bankHour.update({
        where: { employeeId },
        data: { balanceMinutes, lastCalculatedAt },
      });
    } else {
      await this.prisma.bankHour.create({
        data: { tenantId, employeeId, balanceMinutes, lastCalculatedAt },
      });
    }

    this.logger.log(`Bank hours recalculado: employee=${employeeId} balance=${balanceMinutes}min`);
    return balanceMinutes;
  }

  /**
   * Recalcula para todos os funcionários ativos da empresa.
   * Útil como job noturno.
   */
  async recalculateAll(tenantId: string): Promise<{ processed: number; errors: number }> {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { id: true },
    });

    let processed = 0;
    let errors = 0;

    for (const emp of employees) {
      try {
        await this.recalculateBankHours(tenantId, emp.id);
        processed++;
      } catch (err) {
        this.logger.error(`Erro ao recalcular bank hours do funcionário ${emp.id}: ${err}`);
        errors++;
      }
    }

    return { processed, errors };
  }

  /**
   * Relatório consolidado da empresa (todos os funcionários).
   */
  async getCompanyReport(tenantId: string, month: Date) {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: { bankHours: true, schedule: true, department: true },
    });

    const reports = await Promise.all(
      employees.map(async (emp) => {
        const punches = await this.getPunchesAsRecords(tenantId, emp.id, start, end);
        const weeklySchedule: WeeklySchedule = (emp.schedule?.weeklyHours as WeeklySchedule) || {};
        const period = calculatePeriod(start, end, weeklySchedule, punches, {
          entryToleranceMinutes: emp.schedule?.entryToleranceMinutes ?? 10,
          exitToleranceMinutes: emp.schedule?.exitToleranceMinutes ?? 10,
        });

        return {
          employee: {
            id: emp.id,
            name: emp.name,
            department: emp.department?.name,
            registration: emp.registration,
          },
          totals: period.totals,
        };
      }),
    );

    return {
      month: format(month, 'yyyy-MM'),
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      employees: reports,
    };
  }

  // --- private ---

  private async getPunchesAsRecords(
    tenantId: string,
    employeeId: string,
    start: Date,
    end: Date,
  ): Promise<PunchRecord[]> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        employeeId,
        timestamp: { gte: start, lte: end },
        status: { in: ['VALIDATED', 'SYNCED', 'CORRECTED'] },
      },
      orderBy: { timestamp: 'asc' },
      select: { type: true, timestamp: true },
    });

    return records.map((r) => ({
      type: r.type as PunchRecord['type'],
      timestamp: r.timestamp.toISOString(),
    }));
  }
}
