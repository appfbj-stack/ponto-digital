import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { WebhookController } from './webhook.controller';

@Module({
  providers: [BillingService],
  controllers: [BillingController, WebhookController],
  exports: [BillingService],
})
export class BillingModule {}
