import type { Vehicle, VehicleImage } from '../../generated/prisma/client.js';

export type VehicleWithImages = Vehicle & { images: VehicleImage[] };

export interface VehicleImageDto {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
}

export type VehicleDto = Omit<Vehicle, 'images'> & {
  title: string;
  images: VehicleImageDto[];
  primaryImage: VehicleImageDto | null;
  imageCount: number;
};

export const vehicleTitle = (v: Pick<Vehicle, 'make' | 'model' | 'variant'>) =>
  [v.make, v.model, v.variant].filter(Boolean).join(' ');

/** Gallery order: the primary image first, then by sortOrder. */
export function sortImages<T extends Pick<VehicleImage, 'isPrimary' | 'sortOrder'>>(images: T[]): T[] {
  return [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
}

function toImageDto(img: VehicleImage): VehicleImageDto {
  return {
    id: img.id,
    url: img.url,
    thumbUrl: img.thumbUrl,
    alt: img.alt,
    width: img.width,
    height: img.height,
    sortOrder: img.sortOrder,
    isPrimary: img.isPrimary,
  };
}

export function toVehicleDto(v: VehicleWithImages, opts: { imageCount?: number } = {}): VehicleDto {
  const images = sortImages(v.images).map(toImageDto);
  return {
    ...v,
    title: vehicleTitle(v),
    images,
    primaryImage: images[0] ?? null,
    imageCount: opts.imageCount ?? images.length,
  };
}
