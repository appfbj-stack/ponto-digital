import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('super-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Métricas da plataforma' })
  async dashboard() {
    return this.superAdminService.getPlatformDashboard();
  }

  @Get('tenants')
  @ApiOperation({ summary: 'Lista de empresas' })
  async listTenants(@Query('status') status?: string, @Query('search') search?: string) {
    return this.superAdminService.listTenants({ status, search });
  }

  @Post('tenants')
  @ApiOperation({ summary: 'Criar empresa + admin + trial' })
  async createTenant(
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      name: string;
      slug: string;
      cnpj?: string;
      planId: string;
      adminEmail: string;
      adminName: string;
      adminPassword: string;
    },
  ) {
    return this.superAdminService.createTenant(body, user.sub);
  }

  @Patch('tenants/:tenantId/block')
  @ApiOperation({ summary: 'Bloquear empresa' })
  async block(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reason: string },
  ) {
    return this.superAdminService.blockTenant(tenantId, body.reason, user.sub);
  }

  @Patch('tenants/:tenantId/unblock')
  @ApiOperation({ summary: 'Desbloquear empresa' })
  async unblock(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.superAdminService.unblockTenant(tenantId, user.sub);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Auditoria global (cross-tenant)' })
  async audit(@Query('page') page = 1, @Query('pageSize') pageSize = 50) {
    return this.superAdminService.getGlobalAuditLog(Number(page), Number(pageSize));
  }
}
