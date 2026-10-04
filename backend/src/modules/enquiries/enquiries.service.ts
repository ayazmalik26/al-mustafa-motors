import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Paginated } from '../../common/http/api-response.js';
import { pageParams } from '../../common/dto/pagination-query.dto.js';
import { normalizePhone, phoneSearchFragment } from '../../common/utils/phone.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { vehicleTitle } from '../vehicles/vehicle.mapper.js';
import { CreateEnquiryDto, QueryEnquiriesDto, UpdateEnquiryDto } from './dto/enquiry.dto.js';

const VEHICLE_SUMMARY = {
  select: {
    id: true,
    slug: true,
    make: true,
    model: true,
    variant: true,
    year: true,
    status: true,
    images: { where: { isPrimary: true }, take: 1, select: { thumbUrl: true, url: true } },
  },
} satisfies Prisma.Enquiry$vehicleArgs;

@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateEnquiryDto) {
    const { website: _honeypot, vehicleId, ...fields } = dto;
    let vehicleData: Pick<Prisma.EnquiryUncheckedCreateInput, 'vehicleId' | 'vehicleTitle' | 'vehicleSlug'> = {};

    if (vehicleId) {
      // The vehicle name/slug come from the database, never from the client.
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new BadRequestException('The selected vehicle no longer exists');
      vehicleData = { vehicleId, vehicleTitle: `${vehicleTitle(vehicle)} ${vehicle.year}`, vehicleSlug: vehicle.slug };
    }

    const enquiry = await this.prisma.enquiry.create({
      data: {
        ...fields,
        phone: normalizePhone(fields.phone),
        source: fields.source ?? (vehicleId ? 'VEHICLE_PAGE' : 'GENERAL'),
        ...vehicleData,
      },
    });

    this.notifications.notify({
      type: 'enquiry',
      id: enquiry.id,
      name: enquiry.name,
      phone: enquiry.phone,
      vehicleTitle: enquiry.vehicleTitle,
    });

    // Only echo back what the customer needs; internal fields stay private.
    return { id: enquiry.id, status: enquiry.status, createdAt: enquiry.createdAt, vehicleTitle: enquiry.vehicleTitle };
  }

  async list(query: QueryEnquiriesDto) {
    const { page, pageSize, skip, take } = pageParams(query, 20);
    const where: Prisma.EnquiryWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          ...(phoneSearchFragment(query.q) ? [{ phone: { contains: phoneSearchFragment(query.q)! } }] : []),
          { email: { contains: query.q, mode: 'insensitive' } },
          { vehicleTitle: { contains: query.q, mode: 'insensitive' } },
          { message: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.enquiry.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take, include: { vehicle: VEHICLE_SUMMARY } }),
      this.prisma.enquiry.count({ where }),
    ]);
    return Paginated.of(items, total, page, pageSize);
  }

  async findOne(id: string) {
    const enquiry = await this.prisma.enquiry.findUnique({ where: { id }, include: { vehicle: VEHICLE_SUMMARY } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    return enquiry;
  }

  async update(id: string, dto: UpdateEnquiryDto) {
    await this.findOne(id);
    return this.prisma.enquiry.update({ where: { id }, data: dto, include: { vehicle: VEHICLE_SUMMARY } });
  }
}
