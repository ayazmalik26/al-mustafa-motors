import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Paginated } from '../../common/http/api-response.js';
import { pageParams } from '../../common/dto/pagination-query.dto.js';
import { uniqueSlug, vehicleBaseSlug } from '../../common/utils/slug.js';
import { MediaService } from '../storage/media.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { buildVehicleOrderBy, buildVehicleWhere } from './vehicle-query.js';
import { QueryVehiclesDto } from './dto/query-vehicles.dto.js';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto.js';
import { toVehicleDto, type VehicleDto } from './vehicle.mapper.js';

const NON_NULLABLE_FIELDS = ['make', 'model', 'year', 'condition', 'bodyType', 'fuelType', 'transmission', 'status', 'featured', 'isDemo'] as const;
const GALLERY_ORDER: Prisma.VehicleImageOrderByWithRelationInput[] = [{ isPrimary: 'desc' }, { sortOrder: 'asc' }];

export interface VehicleFacets {
  makes: { value: string; count: number }[];
  models: { make: string; model: string; count: number }[];
  bodyTypes: { value: string; count: number }[];
  fuelTypes: { value: string; count: number }[];
  transmissions: { value: string; count: number }[];
  conditions: { value: string; count: number }[];
  statuses: { value: string; count: number }[];
  years: { min: number | null; max: number | null };
  price: { min: number | null; max: number | null };
  mileage: { max: number | null };
  total: number;
}

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(query: QueryVehiclesDto): Promise<Paginated<VehicleDto>> {
    const { page, pageSize, skip, take } = pageParams(query, 12);
    const where = buildVehicleWhere(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: buildVehicleOrderBy(query.sort),
        skip,
        take,
        include: { images: { orderBy: GALLERY_ORDER, take: 1 }, _count: { select: { images: true } } },
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    const items = rows.map(({ _count, ...v }) => toVehicleDto(v, { imageCount: _count.images }));
    return Paginated.of(items, total, page, pageSize);
  }

  async facets(): Promise<VehicleFacets> {
    const count = { _count: { _all: true } } as const;
    const [makes, models, bodyTypes, fuelTypes, transmissions, conditions, statuses, agg] = await Promise.all([
      this.prisma.vehicle.groupBy({ by: ['make'], ...count, orderBy: { make: 'asc' } }),
      this.prisma.vehicle.groupBy({ by: ['make', 'model'], ...count, orderBy: [{ make: 'asc' }, { model: 'asc' }] }),
      this.prisma.vehicle.groupBy({ by: ['bodyType'], ...count, orderBy: { bodyType: 'asc' } }),
      this.prisma.vehicle.groupBy({ by: ['fuelType'], ...count, orderBy: { fuelType: 'asc' } }),
      this.prisma.vehicle.groupBy({ by: ['transmission'], ...count, orderBy: { transmission: 'asc' } }),
      this.prisma.vehicle.groupBy({ by: ['condition'], ...count, orderBy: { condition: 'asc' } }),
      this.prisma.vehicle.groupBy({ by: ['status'], ...count, orderBy: { status: 'asc' } }),
      this.prisma.vehicle.aggregate({
        _min: { year: true, price: true },
        _max: { year: true, price: true, mileage: true },
        _count: { _all: true },
      }),
    ]);
    return {
      makes: makes.map((r) => ({ value: r.make, count: r._count._all })),
      models: models.map((r) => ({ make: r.make, model: r.model, count: r._count._all })),
      bodyTypes: bodyTypes.map((r) => ({ value: r.bodyType, count: r._count._all })),
      fuelTypes: fuelTypes.map((r) => ({ value: r.fuelType, count: r._count._all })),
      transmissions: transmissions.map((r) => ({ value: r.transmission, count: r._count._all })),
      conditions: conditions.map((r) => ({ value: r.condition, count: r._count._all })),
      statuses: statuses.map((r) => ({ value: r.status, count: r._count._all })),
      years: { min: agg._min.year, max: agg._max.year },
      price: { min: agg._min.price, max: agg._max.price },
      mileage: { max: agg._max.mileage },
      total: agg._count._all,
    };
  }

  async findBySlug(slug: string): Promise<VehicleDto> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { slug }, include: { images: { orderBy: GALLERY_ORDER } } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return toVehicleDto(vehicle);
  }

  async findById(id: string): Promise<VehicleDto> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id }, include: { images: { orderBy: GALLERY_ORDER } } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return toVehicleDto(vehicle);
  }

  async create(dto: CreateVehicleDto): Promise<VehicleDto> {
    const { slug: requestedSlug, ...data } = dto;
    const slug = requestedSlug
      ? await this.assertSlugAvailable(requestedSlug)
      : await uniqueSlug(vehicleBaseSlug(dto), (s) => this.slugExists(s));

    const vehicle = await this.prisma.vehicle.create({
      data: { ...data, slug, soldAt: dto.status === 'SOLD' ? new Date() : null },
      include: { images: true },
    });
    return toVehicleDto(vehicle);
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<VehicleDto> {
    const existing = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vehicle not found');

    for (const field of NON_NULLABLE_FIELDS) {
      if ((dto as Record<string, unknown>)[field] === null) throw new BadRequestException(`${field} cannot be empty`);
    }

    const { slug: requestedSlug, ...data } = dto;
    const update: Prisma.VehicleUpdateInput = { ...(data as Prisma.VehicleUpdateInput) };

    if (requestedSlug !== undefined && requestedSlug !== null && requestedSlug !== existing.slug) {
      update.slug = await this.assertSlugAvailable(requestedSlug, id);
    }
    if (dto.status && dto.status !== existing.status) {
      update.soldAt = dto.status === 'SOLD' ? new Date() : null;
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: update,
      include: { images: { orderBy: GALLERY_ORDER } },
    });
    return toVehicleDto(vehicle);
  }

  async remove(id: string): Promise<{ id: string }> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id }, include: { images: true } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    await this.prisma.vehicle.delete({ where: { id } });
    await this.media.remove(vehicle.images.flatMap((img) => img.storageKeys));
    return { id };
  }

  /** Lightweight list for the sitemap. */
  sitemapEntries() {
    return this.prisma.vehicle.findMany({ select: { slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' } });
  }

  private async slugExists(slug: string, exceptId?: string) {
    const found = await this.prisma.vehicle.findUnique({ where: { slug }, select: { id: true } });
    return !!found && found.id !== exceptId;
  }

  private async assertSlugAvailable(slug: string, exceptId?: string) {
    if (await this.slugExists(slug, exceptId)) throw new ConflictException('Another vehicle already uses this URL slug');
    return slug;
  }
}
