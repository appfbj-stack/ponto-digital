import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceType, EmployeeStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard: contadores em tempo (quase) real.
   */
  async dashboard(tenantId: string, timezone: string) {
    const now = new Date();
    const startOfDay = this.startOfDay(now, timezone);
    const endOfDay = this.endOfDay(now, timezone);

    const [totalEmployees, activeEmployees, todayRecords, onBreak] = await Promise.all([
      this.prisma.employee.count({ where: { tenantId } }),
      this.prisma.employee.count({ where: { tenantId, status: EmployeeStatus.ACTIVE } }),
      this.prisma.attendanceRecord.findMany({
        where: { tenantId, timestamp: { gte: startOfDay, lte: endOfDay } },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          tenantId,
          type: AttendanceType.BREAK_START,
          timestamp: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    // Resumos por funcionário
    const byEmployee = new Map<string, { entry?: Date; breakStart?: Date; breakEnd?: Date; exit?: Date }>();
    for (const r of todayRecords) {
      const cur = byEmployee.get(r.employeeId) || {};
      if (r.type === AttendanceType.ENTRY) cur.entry = r.timestamp;
      if (r.type === AttendanceType.BREAK_START) cur.breakStart = r.timestamp;
      if (r.type === AttendanceType.BREAK_END) cur.breakEnd = r.timestamp;
      if (r.type === AttendanceType.EXIT) cur.exit = r.timestamp;
      byEmployee.set(r.employeeId, cur);
    }

    let present = 0;
    let onTime = 0;
    let late = 0;
    let overtime = 0;
    for (const [, r] of byEmployee) {
      if (r.entry) {
        present++;
        if (r.entry.getHours() >= 8 && r.entry.getMinutes() <= 10) onTime++;
        else if (r.entry.getHours() >= 8 && r.entry.getMinutes() > 10) late++;
      }
      if (r.exit && r.exit.getHours() >= 18) overtime++;
    }

    return {
      totalEmployees,
      activeEmployees,
      present,
      absent: activeEmployees - present,
      onTime,
      late,
      onBreak,
      overtime,
      todayRecordsCount: todayRecords.length,
    };
  }

  private startOfDay(date: Date, timezone: string): Date {
    // Simplificado — usa o offset do servidor
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date, timezone: string): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}
