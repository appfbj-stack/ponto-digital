import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { BiometricModule } from '../biometric/biometric.module';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BiometricModule, TimesheetModule, NotificationsModule],
  providers: [AttendanceService],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}
