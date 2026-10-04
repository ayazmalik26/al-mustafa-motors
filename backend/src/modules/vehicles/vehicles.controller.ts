import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Public, Roles } from '../../common/decorators/auth.decorators.js';
import { Role } from '../../generated/prisma/enums.js';
import type { UploadedImageFile } from '../storage/media.service.js';
import { QueryVehiclesDto } from './dto/query-vehicles.dto.js';
import { CreateVehicleDto, ReorderImagesDto, UpdateImageDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { VehiclesService } from './vehicles.service.js';
import { VehicleImagesService } from './vehicle-images.service.js';

@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly images: VehicleImagesService,
  ) {}

  // ── Public ────────────────────────────────────────────────

  @Public()
  @Get()
  list(@Query() query: QueryVehiclesDto) {
    return this.vehicles.list(query);
  }

  @Public()
  @Get('facets')
  facets() {
    return this.vehicles.facets();
  }

  // ── Admin / staff (declared before :slug so "id" is not treated as a slug) ──

  @Get('id/:id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicles.findById(id);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.vehicles.findBySlug(slug);
  }

  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicles.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicles.remove(id);
  }

  // ── Images ────────────────────────────────────────────────

  @Get(':id/images')
  listImages(@Param('id', ParseUUIDPipe) id: string) {
    return this.images.list(id);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 12))
  uploadImages(@Param('id', ParseUUIDPipe) id: string, @UploadedFiles() files: UploadedImageFile[]) {
    return this.images.upload(id, files);
  }

  @Patch(':id/images/reorder')
  reorderImages(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderImagesDto) {
    return this.images.reorder(id, dto.imageIds);
  }

  @Patch(':id/images/:imageId')
  updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() dto: UpdateImageDto,
  ) {
    return this.images.update(id, imageId, dto);
  }

  @Delete(':id/images/:imageId')
  removeImage(@Param('id', ParseUUIDPipe) id: string, @Param('imageId', ParseUUIDPipe) imageId: string) {
    return this.images.remove(id, imageId);
  }
}
