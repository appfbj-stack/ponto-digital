import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CorrectionsService } from './corrections.service';
import { CreateCorrectionDto, ReviewCorrectionDto } from './dto/correction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CorrectionStatus, JwtPayload } from '@kairos/types';

@ApiTags('corrections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('corrections')
export class CorrectionsController {
  constructor(private readonly correctionsService: CorrectionsService) {}

  @Post()
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Solicitar correção de ponto' })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCorrectionDto,
  ) {
    if (!user.employeeId) throw new Error('Usuário sem funcionário vinculado');
    return this.correctionsService.create(tenantId, user.employeeId, dto);
  }

  @Get('my')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Minhas solicitações' })
  async my(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    if (!user.employeeId) return [];
    return this.correctionsService.myRequests(tenantId, user.employeeId);
  }

  @Get()
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Lista de solicitações da empresa (admin)' })
  async list(@TenantId() tenantId: string, @Query('status') status?: CorrectionStatus) {
    return this.correctionsService.listForCompany(tenantId, status);
  }

  @Patch(':id/review')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Aprovar ou rejeitar solicitação' })
  async review(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCorrectionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.correctionsService.review(tenantId, id, dto, user.sub);
  }
}
