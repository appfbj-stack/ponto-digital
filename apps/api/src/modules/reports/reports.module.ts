import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExportsService } from './exports.service';

@Module({
  providers: [ReportsService, ExportsService],
  controllers: [ReportsController],
  exports: [ReportsService, ExportsService],
})
export class ReportsModule {}
