import { PrismaClient, UserRole, EmployeeStatus, ScheduleType, PlanTier, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo123';

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpa dados de demo (idempotente)
  await prisma.auditLog.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.notification.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.bankHour.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.attendanceCorrection.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.attendanceRecord.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.scheduleAssignment.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.employeeLocation.deleteMany({ where: { employee: { tenant: { slug: 'demo' } } } });
  await prisma.device.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.facialBiometric.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.employee.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.workSchedule.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.workLocation.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.department.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.refreshToken.deleteMany({ where: { user: { tenant: { slug: 'demo' } } } });
  await prisma.user.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.license.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.subscription.deleteMany({ where: { tenant: { slug: 'demo' } } });
  await prisma.tenant.deleteMany({ where: { slug: 'demo' } });

  // =====================================================================
  // 1. SUPER ADMIN (não tem tenant)
  // =====================================================================
  const superAdminPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
  await prisma.user.create({
    data: {
      email: 'super@demo.com',
      passwordHash: superAdminPassword,
      role: UserRole.SUPER_ADMIN,
      active: true,
      emailVerified: true,
      tenantId: null,
    },
  });
  console.log('✅ Super Admin criado: super@demo.com');

  // =====================================================================
  // 2. PLANOS
  // =====================================================================
  const basicPlan = await prisma.plan.create({
    data: {
      name: 'Básico',
      tier: PlanTier.BASIC,
      description: 'Ideal para pequenas empresas',
      priceMonthly: 49.9,
      priceYearly: 499.0,
      maxEmployees: 20,
      maxLocations: 1,
      features: {
        facial: true,
        geolocation: true,
        reports: 'basic',
      },
      trialDays: 14,
      active: true,
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'Profissional',
      tier: PlanTier.PRO,
      description: 'Para empresas em crescimento',
      priceMonthly: 99.9,
      priceYearly: 999.0,
      maxEmployees: 100,
      maxLocations: 5,
      features: {
        facial: true,
        geolocation: true,
        reports: 'advanced',
        offline: true,
        pdf: true,
      },
      trialDays: 14,
      active: true,
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Empresarial',
      tier: PlanTier.ENTERPRISE,
      description: 'Recursos avançados e suporte dedicado',
      priceMonthly: 299.9,
      priceYearly: 2999.0,
      maxEmployees: 1000,
      maxLocations: 50,
      features: {
        facial: true,
        geolocation: true,
        reports: 'full',
        offline: true,
        pdf: true,
        api: true,
        sso: true,
      },
      trialDays: 30,
      active: true,
    },
  });
  console.log('✅ 3 planos criados');

  // =====================================================================
  // 3. TENANT (empresa demo)
  // =====================================================================
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Empresa Demo',
      slug: 'demo',
      cnpj: '11.222.333/0001-44',
      timezone: 'America/Sao_Paulo',
      active: true,
      defaultRadiusMeters: 150,
      defaultToleranceMinutes: 10,
      requireFacialValidation: true,
      outOfRadiusBehavior: 'BLOCK',
      planId: proPlan.id,
    },
  });

  // Assinatura trial
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: proPlan.id,
      status: SubscriptionStatus.TRIAL,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✅ Tenant criado: ${tenant.name} (slug: ${tenant.slug})`);

  // Licenças
  await prisma.license.createMany({
    data: [
      { tenantId: tenant.id, feature: 'facial_recognition', enabled: true },
      { tenantId: tenant.id, feature: 'offline_mode', enabled: true },
      { tenantId: tenant.id, feature: 'reports_pdf', enabled: true },
      { tenantId: tenant.id, feature: 'reports_excel', enabled: true },
    ],
  });

  // =====================================================================
  // 4. ADMIN DA EMPRESA
  // =====================================================================
  const adminPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash: adminPassword,
      role: UserRole.COMPANY_ADMIN,
      active: true,
      emailVerified: true,
      tenantId: tenant.id,
    },
  });
  console.log('✅ Admin criado: admin@demo.com');

  // =====================================================================
  // 5. DEPARTAMENTOS
  // =====================================================================
  const [deptAdm, deptoProd, deptoVendas] = await Promise.all([
    prisma.department.create({
      data: { tenantId: tenant.id, name: 'Administrativo', description: 'Setor administrativo' },
    }),
    prisma.department.create({
      data: { tenantId: tenant.id, name: 'Produção', description: 'Linha de produção' },
    }),
    prisma.department.create({
      data: { tenantId: tenant.id, name: 'Vendas', description: 'Equipe comercial' },
    }),
  ]);
  console.log('✅ 3 departamentos criados');

  // =====================================================================
  // 6. LOCAIS DE TRABALHO (geocerca)
  // =====================================================================
  const matriz = await prisma.workLocation.create({
    data: {
      tenantId: tenant.id,
      name: 'Matriz',
      address: 'Av. Paulista, 1000 - São Paulo/SP',
      latitude: -23.561414,
      longitude: -46.655881,
      radiusMeters: 150,
      active: true,
    },
  });

  const filial = await prisma.workLocation.create({
    data: {
      tenantId: tenant.id,
      name: 'Filial Centro',
      address: 'Rua da Consolação, 500 - São Paulo/SP',
      latitude: -23.554480,
      longitude: -46.642800,
      radiusMeters: 100,
      active: true,
    },
  });
  console.log('✅ 2 locais criados');

  // =====================================================================
  // 7. JORNADA DE TRABALHO
  // =====================================================================
  const schedule = await prisma.workSchedule.create({
    data: {
      tenantId: tenant.id,
      name: 'Comercial - Segunda a Sexta',
      scheduleType: ScheduleType.FIVE_BY_TWO,
      description: 'Jornada comercial padrão',
      entryToleranceMinutes: 10,
      exitToleranceMinutes: 10,
      weeklyHours: {
        monday:    { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        tuesday:   { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        wednesday: { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        thursday:  { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        friday:    { entry: '08:00', breakStart: '12:00', breakEnd: '13:00', exit: '17:00' },
        saturday:  null,
        sunday:    null,
      },
      active: true,
    },
  });
  console.log('✅ Jornada criada');

  // =====================================================================
  // 8. FUNCIONÁRIOS DEMO
  // =====================================================================
  const employeePassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const employeesData = [
    { name: 'João Silva',  cpf: '111.111.111-11', email: 'joao@demo.com',  dept: deptAdm.id,    loc: matriz.id,  reg: 'F001' },
    { name: 'Maria Souza', cpf: '222.222.222-22', email: 'maria@demo.com', dept: deptoVendas.id, loc: matriz.id,  reg: 'F002' },
    { name: 'Carlos Lima', cpf: '333.333.333-33', email: 'carlos@demo.com', dept: deptoProd.id, loc: filial.id,  reg: 'F003' },
    { name: 'Ana Pereira', cpf: '444.444.444-44', email: 'ana@demo.com',   dept: deptoProd.id, loc: matriz.id,  reg: 'F004' },
  ];

  for (const emp of employeesData) {
    const user = await prisma.user.create({
      data: {
        email: emp.email,
        passwordHash: employeePassword,
        role: UserRole.EMPLOYEE,
        active: true,
        emailVerified: true,
        tenantId: tenant.id,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        name: emp.name,
        cpf: emp.cpf,
        email: emp.email,
        phone: '11999990000',
        registration: emp.reg,
        position: 'Funcionário',
        departmentId: emp.dept,
        scheduleId: schedule.id,
        status: EmployeeStatus.ACTIVE,
        admissionDate: new Date('2024-01-15'),
      },
    });

    // Vincular ao local
    await prisma.employeeLocation.create({
      data: { employeeId: employee.id, locationId: emp.loc },
    });

    // Vincular à jornada via assignment
    await prisma.scheduleAssignment.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        scheduleId: schedule.id,
        startDate: new Date('2024-01-15'),
      },
    });

    // Criar bank hour zerado
    await prisma.bankHour.create({
      data: { tenantId: tenant.id, employeeId: employee.id, balanceMinutes: 0 },
    });

    // Cria biometria de demo (embedding criptografada placeholder)
    // Em produção, o funcionário cadastra via app com face-api.js
    const placeholderEmbedding = new Array(128).fill(0).map((_, i) => Math.sin(i / 10));
    const encrypted = Buffer.from(JSON.stringify(placeholderEmbedding)).toString('base64');
    await prisma.facialBiometric.create({
      data: {
        tenantId: tenant.id,
        employeeId: employee.id,
        encryptedEmbedding: encrypted,
        provider: 'demo',
        modelVersion: 'demo-v1',
        quality: 0.95,
        samplesCount: 3,
      },
    });

    // Cria registros de ponto de exemplo nos últimos 10 dias úteis
    // (gera dados pra popular o banco de horas)
    const attendance: any[] = [];
    const today = new Date();
    for (let i = 1; i <= 15; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      // Pula fim de semana
      if (day.getDay() === 0 || day.getDay() === 6) continue;

      // Variação: às vezes atrasado, às vezes hora extra
      const variation = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, 1, 2
      const entryHour = 8;
      const entryMin = Math.max(0, Math.min(50, variation * 10)); // 0 a 50 min de atraso

      const entry = new Date(day);
      entry.setHours(entryHour, entryMin, 0, 0);

      const breakStart = new Date(day);
      breakStart.setHours(12, 0, 0, 0);

      const breakEnd = new Date(day);
      breakEnd.setHours(13, 0, 0, 0);

      // Às vezes sai mais cedo, às vezes mais tarde
      const exitVariation = Math.floor(Math.random() * 4) - 1; // -1, 0, 1, 2
      const exitHour = 17 + (exitVariation < 0 ? 0 : Math.floor(exitVariation / 2));
      const exitMin = exitVariation < 0 ? -exitVariation * 10 : 0;
      const exit = new Date(day);
      exit.setHours(exitHour, exitMin, 0, 0);

      attendance.push(
        { type: 'ENTRY', time: entry },
        { type: 'BREAK_START', time: breakStart },
        { type: 'BREAK_END', time: breakEnd },
        { type: 'EXIT', time: exit },
      );
    }

    for (const a of attendance) {
      await prisma.attendanceRecord.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          type: a.type,
          status: 'SYNCED',
          timestamp: a.time,
          faceValidated: true,
          faceLivenessPassed: true,
          inGeofence: true,
          source: 'SEED',
        },
      });
    }
  }
  console.log(`✅ ${employeesData.length} funcionários criados`);

  // =====================================================================
  // 9. AUDIT LOG INICIAL
  // =====================================================================
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      userId: admin.id,
      action: 'CREATE',
      entity: 'Tenant',
      entityId: tenant.id,
      newValue: { name: tenant.name, slug: tenant.slug },
    },
  });

  console.log('\n🎉 Seed concluído!\n');
  console.log('━'.repeat(60));
  console.log('Credenciais de demo (senha: demo123):');
  console.log('━'.repeat(60));
  console.log('  Super Admin:  super@demo.com');
  console.log('  Admin:        admin@demo.com');
  console.log('  Funcionário:  joao@demo.com  (Maria, Carlos, Ana também)');
  console.log('━'.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
