import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Dados da assinatura atual' })
  async getSubscription(@TenantId() tenantId: string) {
    return this.billingService['prisma'].subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
  }

  @Post('subscribe')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assinar um plano (cria customer + subscription no Asaas)' })
  async subscribe(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { planId: string; cpfCnpj: string },
  ) {
    return this.billingService.subscribe(tenantId, body.planId, body.cpfCnpj, user.sub);
  }

  @Post('cancel')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cancelar assinatura' })
  async cancel(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.cancel(tenantId, user.sub);
  }

  @Post('suspend')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Suspender tenant (manual, ex: inadimplência)' })
  async suspend(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reason: string },
  ) {
    return this.billingService.suspend(tenantId, body.reason, user.sub);
  }

  @Post('reactivate')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Reativar tenant suspenso' })
  async reactivate(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.billingService.reactivate(tenantId, user.sub);
  }
}
