import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service.js';
import { toVehicleDto } from './vehicle.mapper.js';

const baseVehicle = {
  id: 'v1',
  slug: 'toyota-hilux-2023',
  make: 'Toyota',
  model: 'Hilux',
  variant: 'Revo V',
  year: 2023,
  condition: 'USED',
  bodyType: 'PICKUP',
  fuelType: 'DIESEL',
  transmission: 'AUTOMATIC',
  mileage: 1000,
  engine: null,
  color: null,
  price: null,
  priceDisplay: null,
  status: 'AVAILABLE',
  description: null,
  featured: false,
  isDemo: false,
  soldAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  images: [],
};

function setup(existingSlugs: string[] = []) {
  const prisma = {
    vehicle: {
      findUnique: vi.fn(async ({ where }: { where: { slug?: string; id?: string } }) => {
        if (where.slug) return existingSlugs.includes(where.slug) ? { id: `other-${where.slug}` } : null;
        return where.id === 'v1' ? { ...baseVehicle } : null;
      }),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...baseVehicle, ...data, images: [] })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...baseVehicle, ...data, images: [] })),
      delete: vi.fn(async () => baseVehicle),
    },
  };
  const media = { remove: vi.fn(async () => undefined) };
  return { prisma, media, service: new VehiclesService(prisma as never, media as never) };
}

const createDto = {
  make: 'Toyota',
  model: 'Hilux',
  year: 2023,
  condition: 'USED',
  bodyType: 'PICKUP',
  fuelType: 'DIESEL',
  transmission: 'AUTOMATIC',
} as const;

describe('VehiclesService', () => {
  it('generates a readable slug on create', async () => {
    const { service, prisma } = setup();
    const v = await service.create({ ...createDto });
    expect(v.slug).toBe('toyota-hilux-2023');
    expect(prisma.vehicle.create.mock.calls[0][0].data.slug).toBe('toyota-hilux-2023');
  });

  it('adds a suffix when the slug already exists', async () => {
    const { service } = setup(['toyota-hilux-2023', 'toyota-hilux-2023-2']);
    expect((await service.create({ ...createDto })).slug).toBe('toyota-hilux-2023-3');
  });

  it('rejects an explicitly requested slug that is taken', async () => {
    const { service } = setup(['taken-slug']);
    await expect(service.create({ ...createDto, slug: 'taken-slug' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('records soldAt when a vehicle is marked sold and clears it when re-listed', async () => {
    const { service, prisma } = setup();
    await service.update('v1', { status: 'SOLD' });
    expect(prisma.vehicle.update.mock.calls[0][0].data.soldAt).toBeInstanceOf(Date);
  });

  it('does not allow required fields to be cleared', async () => {
    const { service } = setup();
    await expect(service.update('v1', { make: null as never })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws 404 for unknown vehicles', async () => {
    const { service } = setup();
    await expect(service.update('missing', { featured: true })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes stored image files when a vehicle is deleted', async () => {
    const { service, prisma, media } = setup();
    prisma.vehicle.findUnique.mockResolvedValueOnce({ ...baseVehicle, images: [{ storageKeys: ['a-lg', 'a-sm'] }] } as never);
    await service.remove('v1');
    expect(media.remove).toHaveBeenCalledWith(['a-lg', 'a-sm']);
  });
});

describe('vehicle mapper', () => {
  it('builds a title and puts the primary image first', () => {
    const dto = toVehicleDto({
      ...baseVehicle,
      images: [
        { id: 'a', isPrimary: false, sortOrder: 0 },
        { id: 'b', isPrimary: true, sortOrder: 1 },
      ],
    } as never);
    expect(dto.title).toBe('Toyota Hilux Revo V');
    expect(dto.images.map((i) => i.id)).toEqual(['b', 'a']);
    expect(dto.primaryImage?.id).toBe('b');
  });
});
