import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, UserRole } from '@kairos/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login: valida credenciais e emite tokens.
   */
  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (!user || !user.active) {
      this.logger.warn(`Login falhou: usuário não encontrado ou inativo - ${email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      this.logger.warn(`Login falhou: senha inválida - ${email}`);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualiza lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      employeeId: user.employee?.id,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(48).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expiresAt = this.parseExpiresIn(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent: userAgent || null,
        ip: ip || null,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        employeeId: user.employee?.id,
        name: user.employee?.name,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: this.expiresInSeconds(process.env.JWT_EXPIRES_IN || '15m'),
      },
    };
  }

  /**
   * Refresh: troca refresh token válido por novo par de tokens.
   * Rotação de refresh token (revoga o anterior).
   */
  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { employee: { select: { id: true, name: true } } },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const user = stored.user;
    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo');
    }

    // Revoga o token atual
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Emite novo par
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      employeeId: user.employee?.id,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = randomBytes(48).toString('base64url');
    const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const expiresAt = this.parseExpiresIn(refreshExpiresIn);

    const newStored = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent: userAgent || null,
        ip: ip || null,
      },
    });

    // Liga o token anterior ao novo (para auditoria)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { replacedBy: newStored.id },
    });

    return {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.expiresInSeconds(process.env.JWT_EXPIRES_IN || '15m'),
      },
    };
  }

  /**
   * Logout: revoga o refresh token atual.
   */
  async logout(refreshToken: string, userId: string) {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (stored && stored.userId === userId && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      await this.prisma.auditLog.create({
        data: {
          tenantId: stored.userId ? null : null,
          userId,
          action: 'LOGOUT',
          entity: 'User',
          entityId: userId,
        },
      });
    }
  }

  /**
   * Valida o payload do JWT e retorna o user atualizado.
   */
  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { employee: { select: { id: true, name: true } } },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      employeeId: user.employee?.id,
    };
  }

  // --- helpers ---

  private parseExpiresIn(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const value = Number(match[1]);
    const unit = match[2];
    const ms =
      unit === 's' ? value * 1000 :
      unit === 'm' ? value * 60 * 1000 :
      unit === 'h' ? value * 60 * 60 * 1000 :
                     value * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + ms);
  }

  private expiresInSeconds(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const value = Number(match[1]);
    const unit = match[2];
    return unit === 's' ? value :
           unit === 'm' ? value * 60 :
           unit === 'h' ? value * 3600 :
                          value * 86400;
  }
}
