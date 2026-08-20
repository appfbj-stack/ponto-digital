import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { RegisterAttendanceDto } from './dto/register-attendance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AttendanceType, JwtPayload } from '@kairos/types';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('register')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Registrar ponto' })
  async register(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterAttendanceDto,
    @Req() req: Request,
  ) {
    if (!user.employeeId) {
      throw new Error('Usuário sem funcionário vinculado');
    }
    return this.attendanceService.register(
      tenantId,
      user.employeeId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('my')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Meus registros de ponto' })
  async my(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!user.employeeId) return [];
    return this.attendanceService.myRecords(
      tenantId,
      user.employeeId,
      startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate ? new Date(endDate) : new Date(),
    );
  }

  @Get('company')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Registros de ponto da empresa' })
  async company(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: AttendanceType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.companyRecords(tenantId, {
      employeeId,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
