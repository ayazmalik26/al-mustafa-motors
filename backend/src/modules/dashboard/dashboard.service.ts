import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const TIMEZONE = 'Asia/Karachi';
const DAYS = 14;
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const since = new Date(Date.now() - DAYS * 86_400_000);
    const [byStatus, featured, enquiriesByStatus, sellByStatus, recentEnquiries, recentSellRequests, enquiryDates, sellDates, byMake] =
      await Promise.all([
        this.prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
        this.prisma.vehicle.count({ where: { featured: true } }),
        this.prisma.enquiry.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
        this.prisma.sellRequest.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
        this.prisma.enquiry.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, phone: true, vehicleTitle: true, status: true, createdAt: true },
        }),
        this.prisma.sellRequest.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, phone: true, vehicleMake: true, vehicleModel: true, vehicleYear: true, intent: true, status: true, createdAt: true },
        }),
        this.prisma.enquiry.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        this.prisma.sellRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        this.prisma.vehicle.groupBy({ by: ['make'], _count: { _all: true }, orderBy: { _count: { make: 'desc' } } }),
      ]);

    const count = <T extends string>(rows: { _count: { _all: number } }[], key: (r: never) => T) =>
      Object.fromEntries(rows.map((r) => [key(r as never), r._count._all])) as Record<T, number>;

    const vehicleCounts = count(byStatus, (r: { status: string }) => r.status);
    const enquiryCounts = count(enquiriesByStatus, (r: { status: string }) => r.status);
    const sellCounts = count(sellByStatus, (r: { status: string }) => r.status);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

    return {
      vehicles: {
        total: sum(vehicleCounts),
        available: vehicleCounts.AVAILABLE ?? 0,
        reserved: vehicleCounts.RESERVED ?? 0,
        sold: vehicleCounts.SOLD ?? 0,
        featured,
      },
      enquiries: { total: sum(enquiryCounts), new: enquiryCounts.NEW ?? 0, contacted: enquiryCounts.CONTACTED ?? 0, closed: enquiryCounts.CLOSED ?? 0 },
      sellRequests: {
        total: sum(sellCounts),
        new: sellCounts.NEW ?? 0,
        open: sum(sellCounts) - (sellCounts.CLOSED ?? 0),
        evaluating: sellCounts.EVALUATING ?? 0,
      },
      leadsByDay: this.bucketByDay(enquiryDates, sellDates),
      inventoryByMake: byMake.map((r) => ({ make: r.make, count: r._count._all })),
      recentEnquiries,
      recentSellRequests,
    };
  }

  /** Daily lead counts for the last 14 days (Karachi time), including days with zero leads. */
  private bucketByDay(enquiries: { createdAt: Date }[], sellRequests: { createdAt: Date }[]) {
    const days: { date: string; enquiries: number; sellRequests: number }[] = [];
    const index = new Map<string, (typeof days)[number]>();
    for (let i = DAYS - 1; i >= 0; i--) {
      const date = dayKey.format(new Date(Date.now() - i * 86_400_000));
      const entry = { date, enquiries: 0, sellRequests: 0 };
      days.push(entry);
      index.set(date, entry);
    }
    for (const e of enquiries) {
      const entry = index.get(dayKey.format(e.createdAt));
      if (entry) entry.enquiries++;
    }
    for (const s of sellRequests) {
      const entry = index.get(dayKey.format(s.createdAt));
      if (entry) entry.sellRequests++;
    }
    return days;
  }
}
