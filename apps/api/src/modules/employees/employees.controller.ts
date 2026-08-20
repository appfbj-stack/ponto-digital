import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeStatusDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmployeeStatus, JwtPayload } from '@kairos/types';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Listar funcionários da empresa' })
  async list(
    @TenantId() tenantId: string,
    @Query('status') status?: EmployeeStatus,
    @Query('departmentId') departmentId?: string,
    @Query('search') search?: string,
  ) {
    return this.employeesService.list(tenantId, { status, departmentId, search });
  }

  @Get('me')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dados do funcionário logado' })
  async me(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return null;
    }
    return this.employeesService.findById(user.tenantId!, user.employeeId);
  }

  @Get(':id')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Buscar funcionário por ID' })
  async findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findById(tenantId, id);
  }

  @Post()
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Criar funcionário' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.create(tenantId, dto, user.sub);
  }

  @Put(':id')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Atualizar funcionário' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.update(tenantId, id, dto, user.sub);
  }

  @Patch(':id/status')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alterar status do funcionário' })
  async updateStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.employeesService.updateStatus(tenantId, id, dto, user.sub);
  }
}
