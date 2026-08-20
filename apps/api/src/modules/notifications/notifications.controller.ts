import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('my')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Minhas notificações' })
  async my(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('unread') unread?: string,
  ) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        employeeId: user.employeeId || null,
        ...(unread === 'true' ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  @Get()
  @Roles('COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Notificações da empresa' })
  async list(
    @TenantId() tenantId: string,
    @Query('employeeId') employeeId?: string,
    @Query('unread') unread?: string,
  ) {
    return this.prisma.notification.findMany({
      where: {
        tenantId,
        ...(employeeId ? { employeeId } : {}),
        ...(unread === 'true' ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  async markRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  @Patch('my/read-all')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Marcar todas as minhas como lidas' })
  async markAllRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prisma.notification.updateMany({
      where: {
        tenantId,
        employeeId: user.employeeId || null,
        read: false,
      },
      data: { read: true, readAt: new Date() },
    });
  }
}
