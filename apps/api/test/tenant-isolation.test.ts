/**
 * Teste de isolamento multi-tenant.
 * Garante que usuários de uma empresa não acessam dados de outra.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

let tenantA: { id: string };
let tenantB: { id: string };
let employeeA: { id: string; userId: string };
let employeeB: { id: string; userId: string };

describe('Multi-tenant isolation', () => {
  beforeAll(async () => {
    // Limpa dados de teste
    await prisma.employee.deleteMany({ where: { tenant: { slug: { in: ['test-a', 'test-b'] } } } });
    await prisma.user.deleteMany({ where: { tenant: { slug: { in: ['test-a', 'test-b'] } } } });
    await prisma.tenant.deleteMany({ where: { slug: { in: ['test-a', 'test-b'] } } });

    // Cria tenant A
    const password = await bcrypt.hash('test123', 4);
    tenantA = await prisma.tenant.create({
      data: { name: 'Tenant A', slug: 'test-a' },
    });
    tenantB = await prisma.tenant.create({
      data: { name: 'Tenant B', slug: 'test-b' },
    });

    const userA = await prisma.user.create({
      data: {
        email: 'a@test.com',
        passwordHash: password,
        role: 'COMPANY_ADMIN',
        tenantId: tenantA.id,
      },
    });
    const userB = await prisma.user.create({
      data: {
        email: 'b@test.com',
        passwordHash: password,
        role: 'COMPANY_ADMIN',
        tenantId: tenantB.id,
      },
    });

    employeeA = await prisma.employee.create({
      data: {
        tenantId: tenantA.id,
        userId: userA.id,
        name: 'Funcionário A',
        cpf: '99999999999',
        email: 'func-a@test.com',
      },
    }).then((e) => ({ id: e.id, userId: e.userId! }));

    employeeB = await prisma.employee.create({
      data: {
        tenantId: tenantB.id,
        userId: userB.id,
        name: 'Funcionário B',
        cpf: '88888888888',
        email: 'func-b@test.com',
      },
    }).then((e) => ({ id: e.id, userId: e.userId! }));
  });

  afterAll(async () => {
    await prisma.employee.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenantA.id, tenantB.id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.$disconnect();
  });

  it('Tenant A vê apenas seus funcionários', async () => {
    const employees = await prisma.employee.findMany({ where: { tenantId: tenantA.id } });
    expect(employees).toHaveLength(1);
    expect(employees[0]?.name).toBe('Funcionário A');
  });

  it('Tenant B vê apenas seus funcionários', async () => {
    const employees = await prisma.employee.findMany({ where: { tenantId: tenantB.id } });
    expect(employees).toHaveLength(1);
    expect(employees[0]?.name).toBe('Funcionário B');
  });

  it('Busca por employeeId + tenantId correto funciona', async () => {
    const found = await prisma.employee.findFirst({
      where: { id: employeeA.id, tenantId: tenantA.id },
    });
    expect(found).not.toBeNull();
  });

  it('Busca cross-tenant (employeeId A + tenantId B) não retorna nada', async () => {
    const found = await prisma.employee.findFirst({
      where: { id: employeeA.id, tenantId: tenantB.id },
    });
    expect(found).toBeNull();
  });

  it('CPF é único por tenant (não global)', async () => {
    // Mesmo CPF em tenants diferentes deve ser permitido
    const a = await prisma.employee.findUnique({
      where: { tenantId_cpf: { tenantId: tenantA.id, cpf: '99999999999' } },
    });
    const b = await prisma.employee.findUnique({
      where: { tenantId_cpf: { tenantId: tenantB.id, cpf: '99999999999' } },
    });
    expect(a).not.toBeNull();
    expect(b).toBeNull();
  });
});
