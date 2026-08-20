import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'EMPLOYEE')
  @ApiOperation({ summary: 'Listar jornadas' })
  async list(@TenantId() tenantId: string) {
    return this.schedulesService.list(tenantId);
  }

  @Get(':id')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.findById(tenantId, id);
  }

  @Post()
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schedulesService.create(tenantId, dto, user.sub);
  }

  @Put(':id')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.schedulesService.update(tenantId, id, dto, user.sub);
  }
}
