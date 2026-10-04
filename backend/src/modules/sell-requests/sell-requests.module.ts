import { Module } from '@nestjs/common';
import { ImageUploadModule } from '../storage/upload.config.js';
import { SellRequestsController } from './sell-requests.controller.js';
import { SellRequestsService } from './sell-requests.service.js';

@Module({
  imports: [ImageUploadModule],
  controllers: [SellRequestsController],
  providers: [SellRequestsService],
})
export class SellRequestsModule {}
