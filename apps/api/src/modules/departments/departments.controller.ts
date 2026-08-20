import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'EMPLOYEE')
  @ApiOperation({ summary: 'Listar departamentos' })
  async list(@TenantId() tenantId: string) {
    return this.departmentsService.list(tenantId);
  }

  @Get(':id')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.departmentsService.findById(tenantId, id);
  }

  @Post()
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.departmentsService.create(tenantId, dto.name, dto.description, user.sub);
  }

  @Put(':id')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.departmentsService.update(tenantId, id, dto.name!, dto.description, user.sub);
  }
}
