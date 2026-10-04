import { Module } from '@nestjs/common';
import { ImageUploadModule } from '../storage/upload.config.js';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';
import { VehicleImagesService } from './vehicle-images.service.js';

@Module({
  imports: [ImageUploadModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleImagesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
