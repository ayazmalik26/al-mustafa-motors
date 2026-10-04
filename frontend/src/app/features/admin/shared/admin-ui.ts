/** Small presentation helpers shared by the admin pages. */
export const ENQUIRY_STATUS_STYLE: Record<string, string> = {
  NEW: 'bg-[#e3eefc] text-[#1f5aa6]',
  CONTACTED: 'bg-[#fbf0d9] text-[#7a5410]',
  EVALUATING: 'bg-[#efe7fb] text-[#5b3c99]',
  CLOSED: 'bg-[#ebebe8] text-[#55574f]',
};

export const VEHICLE_STATUS_LABEL: Record<string, string> = { AVAILABLE: 'Available', RESERVED: 'Reserved', SOLD: 'Sold' };

export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
