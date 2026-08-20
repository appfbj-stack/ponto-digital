import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createFaceProvider, type FaceProvider, FaceProviderError } from '@kairos/face';
import { encrypt, decrypt, generateUuid } from '@kairos/utils';
import { AuditAction } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { RegisterBiometricDto, VerifyBiometricDto } from './dto/biometric.dto';

@Injectable()
export class BiometricService implements OnModuleInit {
  private readonly logger = new Logger(BiometricService.name);
  private provider!: FaceProvider;
  private encryptionKey!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const providerName = (this.config.get<string>('FACE_PROVIDER') || 'face-api-js') as
      | 'face-api-js'
      | 'mock'
      | 'aws'
      | 'azure';
    const threshold = Number(this.config.get<string>('FACE_SIMILARITY_THRESHOLD') || '0.6');
    const encryptionKey = this.config.get<string>('BIOMETRIC_ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('BIOMETRIC_ENCRYPTION_KEY deve ter no mínimo 32 caracteres');
    }
    this.encryptionKey = encryptionKey;

    this.provider = createFaceProvider({
      provider: providerName,
      similarityThreshold: threshold,
    });
    await this.provider.initialize();
    this.logger.log(`✅ FaceProvider inicializado: ${this.provider.name}`);
  }

  /**
   * Cadastra (ou atualiza) a biometria de um funcionário.
   * Recebe 3-5 amostras e gera uma embedding média mais robusta.
   */
  async register(
    tenantId: string,
    employeeId: string,
    dto: RegisterBiometricDto,
    actorUserId: string,
  ) {
    if (dto.samples.length < 1) {
      throw new BadRequestException('Envie pelo menos 1 amostra de embedding');
    }
    if (dto.samples.length > 10) {
      throw new BadRequestException('Máximo de 10 amostras por cadastro');
    }

    // Valida cada embedding recebida
    for (const sample of dto.samples) {
      const validation = this.provider.validateEmbedding(sample.embedding);
      if (!validation.valid) {
        throw new BadRequestException(`Embedding inválida: ${validation.reason}`);
      }
    }

    // Valida liveness
    const livenessCheck = await this.provider.validateLiveness({
      passed: dto.liveness.confidence >= 0.5,
      confidence: dto.liveness.confidence,
      checks: dto.liveness.checks,
    });
    if (!livenessCheck.valid) {
      throw new BadRequestException(`Liveness inválido: ${livenessCheck.reason}`);
    }

    // Calcula embedding média (mais robusta que uma única captura)
    const averagedEmbedding = this.averageEmbeddings(dto.samples.map((s) => s.embedding));
    const averagedQuality = dto.samples.reduce((sum, s) => sum + s.quality, 0) / dto.samples.length;

    // Criptografa antes de salvar
    const encrypted = encrypt(JSON.stringify(averagedEmbedding), this.encryptionKey);
    const clientEventId = generateUuid();

    // Upsert (atualiza se já existir)
    const existing = await this.prisma.facialBiometric.findUnique({
      where: { employeeId },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.facialBiometric.update({
            where: { employeeId },
            data: {
              encryptedEmbedding: encrypted,
              provider: this.provider.name,
              modelVersion: dto.samples[0]!.modelVersion,
              quality: averagedQuality,
              samplesCount: dto.samples.length,
              updatedAt: new Date(),
            },
          })
        : await tx.facialBiometric.create({
            data: {
              tenantId,
              employeeId,
              encryptedEmbedding: encrypted,
              provider: this.provider.name,
              modelVersion: dto.samples[0]!.modelVersion,
              quality: averagedQuality,
              samplesCount: dto.samples.length,
            },
          });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: existing ? AuditAction.BIOMETRIC_UPDATE : AuditAction.BIOMETRIC_REGISTER,
          entity: 'FacialBiometric',
          entityId: saved.id,
          newValue: {
            employeeId,
            provider: saved.provider,
            samplesCount: saved.samplesCount,
            quality: averagedQuality,
          },
        },
      });

      return saved;
    });

    this.logger.log(
      `Biometria ${existing ? 'atualizada' : 'cadastrada'}: employee=${employeeId} (${dto.samples.length} amostras, quality=${averagedQuality.toFixed(2)})`,
    );

    return {
      id: result.id,
      registeredAt: result.registeredAt,
      updatedAt: result.updatedAt,
      samplesCount: result.samplesCount,
      quality: result.quality,
      // clientEventId poderia ser usado pra idempotência
      _clientEventId: clientEventId,
    };
  }

  /**
   * Verifica uma embedding ao vivo contra a cadastrada.
   * Chamado durante o registro de ponto.
   */
  async verify(tenantId: string, employeeId: string, dto: VerifyBiometricDto) {
    // Valida embedding recebida
    const embValid = this.provider.validateEmbedding(dto.embedding.embedding);
    if (!embValid.valid) {
      throw new BadRequestException(`Embedding inválida: ${embValid.reason}`);
    }

    // Valida liveness
    const livenessCheck = await this.provider.validateLiveness({
      passed: dto.liveness.confidence >= 0.5,
      confidence: dto.liveness.confidence,
      checks: dto.liveness.checks,
    });
    if (!livenessCheck.valid) {
      throw new ConflictException(`Liveness falhou: ${livenessCheck.reason}`);
    }

    // Busca embedding armazenada
    const stored = await this.prisma.facialBiometric.findUnique({
      where: { employeeId },
    });
    if (!stored) {
      throw new NotFoundException('Funcionário sem biometria cadastrada');
    }

    // Descriptografa
    let storedEmbedding: number[];
    try {
      storedEmbedding = JSON.parse(decrypt(stored.encryptedEmbedding, this.encryptionKey));
    } catch (err) {
      this.logger.error(`Falha ao descriptografar biometria do funcionário ${employeeId}`, err);
      throw new FaceProviderError('Biometria corrompida — recadastro necessário', 'DECRYPT_FAILED');
    }

    // Compara
    const result = await this.provider.verify(
      {
        embedding: storedEmbedding,
        modelVersion: stored.modelVersion ?? 'unknown',
        quality: stored.quality ?? 0,
        size: storedEmbedding.length,
      },
      {
        embedding: dto.embedding.embedding,
        modelVersion: dto.embedding.modelVersion,
        quality: dto.embedding.quality,
        size: dto.embedding.embedding.length,
      },
    );

    // Audit log de verificação (não do match em si, isso vai no attendance)
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        action: AuditAction.UPDATE,
        entity: 'FacialBiometric',
        entityId: stored.id,
        newValue: {
          matched: result.matched,
          distance: result.distance,
          confidence: result.confidence,
          modelVersion: dto.embedding.modelVersion,
        },
      },
    });

    return {
      matched: result.matched,
      distance: result.distance,
      confidence: result.confidence,
      threshold: this.provider['threshold'] ?? 0.6,
    };
  }

  /**
   * Remove biometria de um funcionário.
   */
  async remove(tenantId: string, employeeId: string, actorUserId: string) {
    const existing = await this.prisma.facialBiometric.findUnique({
      where: { employeeId },
    });
    if (!existing) {
      throw new NotFoundException('Funcionário sem biometria cadastrada');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.facialBiometric.delete({ where: { employeeId } });
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: actorUserId,
          action: AuditAction.BIOMETRIC_DELETE,
          entity: 'FacialBiometric',
          entityId: existing.id,
          oldValue: { employeeId, provider: existing.provider },
        },
      });
    });

    this.logger.log(`Biometria removida: employee=${employeeId}`);
    return { success: true };
  }

  /**
   * Verifica se funcionário tem biometria cadastrada (sem expor dados).
   */
  async hasBiometric(employeeId: string): Promise<boolean> {
    const found = await this.prisma.facialBiometric.findUnique({
      where: { employeeId },
      select: { id: true },
    });
    return !!found;
  }

  // --- private ---

  /**
   * Média de múltiplas embeddings. Como o vetor está em espaço euclidiano,
   * a média simples funciona bem pra embeddings do tipo 128-d normalizadas.
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) return [];
    if (embeddings.length === 1) return embeddings[0]!;

    const size = embeddings[0]!.length;
    const averaged = new Array(size).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < size; i++) {
        averaged[i] += emb[i]!;
      }
    }
    for (let i = 0; i < size; i++) {
      averaged[i] /= embeddings.length;
    }

    // Re-normaliza (L2)
    const norm = Math.sqrt(averaged.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < size; i++) {
        averaged[i] /= norm;
      }
    }
    return averaged;
  }
}
