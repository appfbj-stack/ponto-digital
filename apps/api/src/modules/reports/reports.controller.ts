import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly exportsService: ExportsService,
  ) {}

  @Get('dashboard')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Métricas do dashboard' })
  async dashboard(@TenantId() tenantId: string) {
    return this.reportsService.dashboard(tenantId, 'America/Sao_Paulo');
  }

  // ---- Exportações PDF/Excel ----

  @Get('timesheet/:employeeId/pdf')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Exportar espelho de ponto em PDF' })
  async timesheetPDF(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    const { start, end } = this.parsePeriod(startDate, endDate, month);
    const buffer = await this.exportsService.generateTimesheetPDF(
      tenantId,
      employeeId,
      start,
      end,
    );

    const filename = `espelho-${employeeId}-${format(start, 'yyyy-MM')}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Get('timesheet/:employeeId/excel')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Exportar espelho de ponto em Excel' })
  async timesheetExcel(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    const { start, end } = this.parsePeriod(startDate, endDate, month);
    const buffer = await this.exportsService.generateTimesheetExcel(
      tenantId,
      employeeId,
      start,
      end,
    );

    const filename = `espelho-${employeeId}-${format(start, 'yyyy-MM')}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Get('attendance-log/excel')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Exportar log de registros de ponto em Excel' })
  async attendanceLogExcel(
    @TenantId() tenantId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? parseISO(startDate) : startOfMonth(new Date());
    const end = endDate ? parseISO(endDate) : endOfMonth(new Date());
    const buffer = await this.exportsService.generateAttendanceLogExcel(tenantId, start, end);

    const filename = `registros-${format(start, 'yyyy-MM-dd')}-a-${format(end, 'yyyy-MM-dd')}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  // --- helpers ---

  private parsePeriod(
    startDate?: string,
    endDate?: string,
    month?: string,
  ): { start: Date; end: Date } {
    if (startDate && endDate) {
      return { start: parseISO(startDate), end: parseISO(endDate) };
    }
    if (month) {
      const ref = parseISO(`${month}-01`);
      return { start: startOfMonth(ref), end: endOfMonth(ref) };
    }
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

function format(d: Date, pattern: string): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (pattern === 'yyyy-MM') return `${y}-${m}`;
  if (pattern === 'yyyy-MM-dd') return `${y}-${m}-${day}`;
  return d.toISOString();
}
