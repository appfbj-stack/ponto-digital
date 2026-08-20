import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { LocationsModule } from './modules/locations/locations.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { BiometricModule } from './modules/biometric/biometric.module';
import { CorrectionsModule } from './modules/corrections/corrections.module';
import { TimesheetModule } from './modules/timesheet/timesheet.module';
import { BillingModule } from './modules/billing/billing.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { PlansModule } from './modules/plans/plans.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Config (env validation)
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),

    // Rate limiting global
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL) * 1000 || 60000,
        limit: Number(process.env.RATE_LIMIT_MAX) || 100,
      },
    ]),

    // Database
    PrismaModule,

    // Features
    AuthModule,
    TenantsModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    LocationsModule,
    SchedulesModule,
    AttendanceModule,
    ReportsModule,
    AuditModule,
    BiometricModule,
    CorrectionsModule,
    TimesheetModule,
    BillingModule,
    SuperAdminModule,
    PlansModule,
    NotificationsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
