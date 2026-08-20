import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @Roles('COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dados da empresa atual do usuário' })
  async me(@TenantId() tenantId: string | null) {
    if (!tenantId) {
      return { message: 'Usuário sem tenant vinculado' };
    }
    return this.tenantsService.getCurrentTenant(tenantId);
  }
}
