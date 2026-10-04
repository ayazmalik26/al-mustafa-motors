import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/auth.decorators.js';
import { CreateEnquiryDto, QueryEnquiriesDto, UpdateEnquiryDto } from './dto/enquiry.dto.js';
import { EnquiriesService } from './enquiries.service.js';

@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Public()
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiries.create(dto);
  }

  @Get()
  list(@Query() query: QueryEnquiriesDto) {
    return this.enquiries.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.enquiries.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEnquiryDto) {
    return this.enquiries.update(id, dto);
  }
}
