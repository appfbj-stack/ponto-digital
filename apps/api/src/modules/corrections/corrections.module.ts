import { Module } from '@nestjs/common';
import { CorrectionsService } from './corrections.service';
import { CorrectionsController } from './corrections.controller';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TimesheetModule, NotificationsModule],
  providers: [CorrectionsService],
  controllers: [CorrectionsController],
  exports: [CorrectionsService],
})
export class CorrectionsModule {}
