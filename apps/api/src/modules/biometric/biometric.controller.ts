import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BiometricService } from './biometric.service';
import { RegisterBiometricDto, VerifyBiometricDto } from './dto/biometric.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@kairos/types';

@ApiTags('biometric')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('biometric')
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

  @Post('register')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cadastrar/atualizar biometria facial do funcionário logado' })
  async register(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RegisterBiometricDto,
  ) {
    const employeeId = user.employeeId;
    if (!employeeId) {
      throw new Error('Usuário sem funcionário vinculado');
    }
    return this.biometricService.register(tenantId, employeeId, dto, user.sub);
  }

  @Post('register/:employeeId')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cadastrar biometria facial de um funcionário (admin)' })
  async registerForEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Body() dto: RegisterBiometricDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.biometricService.register(tenantId, employeeId, dto, user.sub);
  }

  @Post('verify')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Verificar biometria facial no momento do ponto' })
  async verify(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyBiometricDto,
  ) {
    if (!user.employeeId) {
      throw new Error('Usuário sem funcionário vinculado');
    }
    return this.biometricService.verify(tenantId, user.employeeId, dto);
  }

  @Delete('me')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remover biometria do funcionário logado' })
  async removeMine(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      throw new Error('Usuário sem funcionário vinculado');
    }
    return this.biometricService.remove(tenantId, user.employeeId, user.sub);
  }

  @Delete(':employeeId')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remover biometria de um funcionário (admin)' })
  async removeForEmployee(
    @TenantId() tenantId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.biometricService.remove(tenantId, employeeId, user.sub);
  }

  @Get('me/status')
  @Roles('EMPLOYEE', 'COMPANY_ADMIN', 'MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Verifica se funcionário logado tem biometria cadastrada' })
  async myStatus(@CurrentUser() user: JwtPayload) {
    if (!user.employeeId) {
      return { hasBiometric: false };
    }
    const has = await this.biometricService.hasBiometric(user.employeeId);
    return { hasBiometric: has };
  }
}
