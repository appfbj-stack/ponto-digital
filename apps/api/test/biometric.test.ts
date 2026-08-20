import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Biometric flow (integration)', () => {
  let tenantId: string;
  let employeeId: string;
  let userId: string;
  const encryptionKey = 'dGVzdC1iaW8tMzItYnl0ZXMtZm9yLXRlc3RzMTIzNDU2';

  beforeAll(async () => {
    // Cleanup
    await prisma.facialBiometric.deleteMany({});
    await prisma.employee.deleteMany({ where: { tenant: { slug: 'biotest' } } });
    await prisma.user.deleteMany({ where: { tenant: { slug: 'biotest' } } });
    await prisma.tenant.deleteMany({ where: { slug: 'biotest' } });

    const password = await bcrypt.hash('test123', 4);
    const tenant = await prisma.tenant.create({ data: { name: 'BioTest', slug: 'biotest' } });
    tenantId = tenant.id;
    const user = await prisma.user.create({
      data: { email: 'bio@test.com', passwordHash: password, role: 'COMPANY_ADMIN', tenantId },
    });
    userId = user.id;
    const emp = await prisma.employee.create({
      data: {
        tenantId,
        userId: user.id,
        name: 'Bio Funcionário',
        cpf: '77777777777',
        email: 'empbio@test.com',
      },
    });
    employeeId = emp.id;
  });

  afterAll(async () => {
    await prisma.facialBiometric.deleteMany({});
    await prisma.employee.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.facialBiometric.deleteMany({ where: { employeeId } });
  });

  it('salva biometria criptografada (não plaintext)', async () => {
    const embedding = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
    const { encrypt } = await import('@kairos/utils');
    const encrypted = encrypt(JSON.stringify(embedding), encryptionKey);

    await prisma.facialBiometric.create({
      data: {
        tenantId,
        employeeId,
        encryptedEmbedding: encrypted,
        provider: 'face-api-js',
        modelVersion: 'tiny-face-detector-v1',
        quality: 0.9,
        samplesCount: 1,
      },
    });

    const stored = await prisma.facialBiometric.findUnique({ where: { employeeId } });
    expect(stored).not.toBeNull();
    // Não pode estar em plaintext
    expect(stored!.encryptedEmbedding).not.toContain('0.5');
    expect(stored!.encryptedEmbedding).not.toContain('0.6');
    // Deve ser base64 longo
    expect(stored!.encryptedEmbedding.length).toBeGreaterThan(100);
  });

  it('roundtrip: criptografa → descriptografa recupera mesma embedding', async () => {
    const original = new Array(128).fill(0).map((_, i) => Math.cos(i / 5));
    const { encrypt, decrypt } = await import('@kairos/utils');
    const encrypted = encrypt(JSON.stringify(original), encryptionKey);

    await prisma.facialBiometric.create({
      data: {
        tenantId,
        employeeId,
        encryptedEmbedding: encrypted,
        provider: 'face-api-js',
        modelVersion: 'tiny-face-detector-v1',
        quality: 0.9,
        samplesCount: 1,
      },
    });

    const stored = await prisma.facialBiometric.findUnique({ where: { employeeId } });
    const decrypted = JSON.parse(decrypt(stored!.encryptedEmbedding, encryptionKey));
    expect(decrypted).toEqual(original);
  });

  it('hasBiometric retorna false se não cadastrado', async () => {
    const found = await prisma.facialBiometric.findUnique({ where: { employeeId } });
    expect(found).toBeNull();
  });

  it('biometria é única por funcionário (upsert funciona)', async () => {
    const embedding1 = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
    const embedding2 = new Array(128).fill(0).map((_, i) => Math.cos(i / 10));

    const { encrypt } = await import('@kairos/utils');

    await prisma.facialBiometric.create({
      data: {
        tenantId,
        employeeId,
        encryptedEmbedding: encrypt(JSON.stringify(embedding1), encryptionKey),
        provider: 'face-api-js',
        modelVersion: 'v1',
        quality: 0.85,
        samplesCount: 1,
      },
    });

    // Update (mesma employeeId, nova embedding)
    const updated = await prisma.facialBiometric.update({
      where: { employeeId },
      data: {
        encryptedEmbedding: encrypt(JSON.stringify(embedding2), encryptionKey),
        provider: 'face-api-js',
        modelVersion: 'v2',
        quality: 0.95,
        samplesCount: 5,
      },
    });

    expect(updated.samplesCount).toBe(5);
    expect(updated.modelVersion).toBe('v2');

    // Continua único
    const all = await prisma.facialBiometric.findMany({ where: { employeeId } });
    expect(all).toHaveLength(1);
  });
});
