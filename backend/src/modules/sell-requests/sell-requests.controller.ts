import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/auth.decorators.js';
import type { UploadedImageFile } from '../storage/media.service.js';
import { CreateSellRequestDto, QuerySellRequestsDto, UpdateSellRequestDto } from './dto/sell-request.dto.js';
import { SellRequestsService } from './sell-requests.service.js';

@Controller('sell-requests')
export class SellRequestsController {
  constructor(private readonly sellRequests: SellRequestsService) {}

  /** Accepts JSON or multipart/form-data with up to 6 optional photos in the `images` field. */
  @Public()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @Post()
  @UseInterceptors(FilesInterceptor('images', 6))
  create(@Body() dto: CreateSellRequestDto, @UploadedFiles() files: UploadedImageFile[] = []) {
    return this.sellRequests.create(dto, files);
  }

  @Get()
  list(@Query() query: QuerySellRequestsDto) {
    return this.sellRequests.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sellRequests.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSellRequestDto) {
    return this.sellRequests.update(id, dto);
  }
}
