/** Price presets (PKR) used by the vehicle finder and inventory filters. */
export const PRICE_STEPS = [1_000_000, 2_500_000, 5_000_000, 7_500_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000];

/** Mileage presets (km). */
export const MILEAGE_STEPS = [10_000, 25_000, 50_000, 75_000, 100_000, 150_000];

export function yearOptions(min: number | null | undefined, max: number | null | undefined): number[] {
  const top = Math.max(max ?? new Date().getFullYear() + 1, new Date().getFullYear());
  const bottom = Math.min(min ?? top - 15, top);
  const years: number[] = [];
  for (let y = top; y >= bottom; y--) years.push(y);
  return years;
}
