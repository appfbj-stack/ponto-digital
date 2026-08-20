import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';
import { JwtPayload } from '@kairos/types';

/**
 * Extrai o tenantId do JWT.
 * SUPER_ADMIN pode passar tenantId explícito no header "X-Tenant-Id" para
 * impersonar uma empresa (somente no painel super-admin).
 */
export const TenantId = createParamDecorator(
  (required: boolean = true, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;

    if (user?.role === 'SUPER_ADMIN') {
      const headerTenant = request.headers['x-tenant-id'] as string | undefined;
      return headerTenant || null;
    }

    if (!user?.tenantId) {
      if (required) {
        throw new BadRequestException('Usuário sem tenant vinculado');
      }
      return null;
    }

    return user.tenantId;
  },
);
