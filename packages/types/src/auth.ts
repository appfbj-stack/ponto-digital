/**
 * Tipos compartilhados de autenticação.
 * Usados tanto no backend (NestJS) quanto no frontend (Next.js).
 */

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  employeeId?: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;        // user id
  email: string;
  role: UserRole;
  tenantId: string | null;
  employeeId?: string;
  iat?: number;
  exp?: number;
}
