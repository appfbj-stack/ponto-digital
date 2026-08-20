import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TimesheetService } from './timesheet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

@ApiTags('timesheet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly timesheetService: TimesheetService) {}

  @Get('me')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Meu espelho de ponto (período)' })
  async myTimesheet(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    if (!user.employeeId) return null;
    const { start, end } = this.parsePeriod(startDate, endDate, month);
    return this.timesheetService.getTimesheet(tenantId, user.employeeId, start, end);
  }

  @Get('employee/:employeeId')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Espelho de ponto de um funcionário' })
  async employeeTimesheet(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    const { start, end } = this.parsePeriod(startDate, endDate, month);
    return this.timesheetService.getTimesheet(tenantId, employeeId, start, end);
  }

  @Get('company')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Relatório consolidado da empresa no mês' })
  async companyReport(
    @TenantId() tenantId: string,
    @Query('month') month?: string,
  ) {
    const refMonth = month ? parseISO(`${month}-01`) : new Date();
    return this.timesheetService.getCompanyReport(tenantId, refMonth);
  }

  @Post('recalculate/me')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Recalcular meu banco de horas' })
  async recalculateMine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return null;
    const balance = await this.timesheetService.recalculateBankHours(tenantId, user.employeeId);
    return { balanceMinutes: balance };
  }

  @Post('recalculate/:employeeId')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Recalcular banco de horas de um funcionário' })
  async recalculate(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    const balance = await this.timesheetService.recalculateBankHours(tenantId, employeeId);
    return { balanceMinutes: balance };
  }

  @Post('recalculate-all')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Recalcular banco de horas de toda a empresa' })
  async recalculateAll(@TenantId() tenantId: string) {
    return this.timesheetService.recalculateAll(tenantId);
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
