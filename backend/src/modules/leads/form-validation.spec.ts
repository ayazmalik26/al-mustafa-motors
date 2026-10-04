import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEnquiryDto } from '../enquiries/dto/enquiry.dto.js';
import { CreateSellRequestDto } from '../sell-requests/dto/sell-request.dto.js';
import { CreateVehicleDto } from '../vehicles/dto/vehicle.dto.js';

async function errorsFor<T extends object>(cls: new () => T, plain: Record<string, unknown>) {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, fields: errors.map((e) => e.property).sort() };
}

describe('enquiry form validation', () => {
  const valid = { name: 'Ahmed Khan', phone: '0300 1234567', message: 'Is the Fortuner still available?' };

  it('accepts a valid enquiry without email', async () => {
    expect((await errorsFor(CreateEnquiryDto, valid)).fields).toEqual([]);
  });

  it('requires name and phone', async () => {
    expect((await errorsFor(CreateEnquiryDto, { ...valid, name: '  ', phone: '' })).fields).toEqual(['name', 'phone']);
  });

  it('validates email only when supplied', async () => {
    expect((await errorsFor(CreateEnquiryDto, { ...valid, email: '' })).fields).toEqual([]);
    expect((await errorsFor(CreateEnquiryDto, { ...valid, email: 'not-an-email' })).fields).toEqual(['email']);
  });

  it('enforces a minimum message length', async () => {
    expect((await errorsFor(CreateEnquiryDto, { ...valid, message: 'hi' })).fields).toEqual(['message']);
  });

  it('rejects filled honeypot fields and unknown fields', async () => {
    expect((await errorsFor(CreateEnquiryDto, { ...valid, website: 'http://spam' })).fields).toEqual(['website']);
    expect((await errorsFor(CreateEnquiryDto, { ...valid, isAdmin: true })).fields).toEqual(['isAdmin']);
  });

  it('trims whitespace', async () => {
    const { instance } = await errorsFor(CreateEnquiryDto, { ...valid, name: '  Ahmed  ' });
    expect(instance.name).toBe('Ahmed');
  });
});

describe('sell / exchange form validation', () => {
  const valid = {
    name: 'Sara Ali',
    phone: '+92 321 7654321',
    vehicleMake: 'Honda',
    vehicleModel: 'City',
    vehicleYear: '2019',
    mileage: '80,000',
    intent: 'EXCHANGE',
  };

  it('accepts multipart-style string values and converts numbers', async () => {
    const { instance, fields } = await errorsFor(CreateSellRequestDto, valid);
    expect(fields).toEqual([]);
    expect(instance.vehicleYear).toBe(2019);
    expect(instance.mileage).toBe(80000);
  });

  it('rejects impossible years and unknown intents', async () => {
    expect((await errorsFor(CreateSellRequestDto, { ...valid, vehicleYear: '1800', intent: 'RENT' })).fields).toEqual([
      'intent',
      'vehicleYear',
    ]);
  });

  it('treats empty optional fields as not provided', async () => {
    const { instance, fields } = await errorsFor(CreateSellRequestDto, { ...valid, mileage: '', expectedPrice: '', email: '' });
    expect(fields).toEqual([]);
    expect(instance.mileage).toBeUndefined();
  });
});

describe('vehicle form validation', () => {
  const valid = {
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    condition: 'USED',
    bodyType: 'SEDAN',
    fuelType: 'PETROL',
    transmission: 'AUTOMATIC',
  };

  it('accepts the required fields', async () => {
    expect((await errorsFor(CreateVehicleDto, valid)).fields).toEqual([]);
  });

  it('rejects bad enums, negative prices and invalid slugs', async () => {
    const { fields } = await errorsFor(CreateVehicleDto, { ...valid, condition: 'OLD', price: -5, slug: 'Bad Slug!' });
    expect(fields).toEqual(['condition', 'price', 'slug']);
  });

  it('turns empty optional text into null (so it can be cleared)', async () => {
    const { instance } = await errorsFor(CreateVehicleDto, { ...valid, variant: '  ', color: '' });
    expect(instance.variant).toBeNull();
    expect(instance.color).toBeNull();
  });
});
