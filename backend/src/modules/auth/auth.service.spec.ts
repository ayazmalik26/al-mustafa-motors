import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

const jwt = new JwtService({ secret: 'test-secret-test-secret', signOptions: { expiresIn: '1h' } });

function makePrisma(users: Record<string, unknown>[]) {
  return {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email?: string; id?: string } }) =>
        users.find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null,
      ),
      update: vi.fn(async () => ({})),
    },
  };
}

describe('AuthService', () => {
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('Correct-Horse-1', 4);
  });

  const admin = () => ({ id: 'u1', name: 'Admin', email: 'admin@test.local', role: 'ADMIN', isActive: true, passwordHash });

  it('logs in with valid credentials and returns a verifiable token', async () => {
    const prisma = makePrisma([admin()]);
    const service = new AuthService(prisma as never, jwt);

    const result = await service.login('Admin@Test.local', 'Correct-Horse-1');

    expect(result.user).toEqual({ id: 'u1', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' });
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.user.update).toHaveBeenCalled();
    await expect(service.verify(result.token)).resolves.toMatchObject({ id: 'u1', role: 'ADMIN' });
  });

  it('never stores or returns the password hash', async () => {
    const service = new AuthService(makePrisma([admin()]) as never, jwt);
    const result = await service.login('admin@test.local', 'Correct-Horse-1');
    expect(JSON.stringify(result)).not.toContain(passwordHash);
  });

  it('rejects a wrong password', async () => {
    const service = new AuthService(makePrisma([admin()]) as never, jwt);
    await expect(service.login('admin@test.local', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email with the same error', async () => {
    const service = new AuthService(makePrisma([]) as never, jwt);
    await expect(service.login('nobody@test.local', 'whatever')).rejects.toThrow('Invalid email or password');
  });

  it('rejects deactivated users', async () => {
    const service = new AuthService(makePrisma([{ ...admin(), isActive: false }]) as never, jwt);
    await expect(service.login('admin@test.local', 'Correct-Horse-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tampered or foreign tokens', async () => {
    const service = new AuthService(makePrisma([admin()]) as never, jwt);
    const foreign = await new JwtService({ secret: 'another-secret-entirely' }).signAsync({ sub: 'u1', role: 'ADMIN' });
    await expect(service.verify(foreign)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.verify('not-a-jwt')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens for users that were deleted after login', async () => {
    const users = [admin()];
    const service = new AuthService(makePrisma(users) as never, jwt);
    const { token } = await service.login('admin@test.local', 'Correct-Horse-1');
    users.length = 0;
    await expect(service.verify(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('hashes passwords with bcrypt', async () => {
    const hash = await AuthService.hashPassword('Secret-123');
    expect(hash).not.toContain('Secret-123');
    await expect(bcrypt.compare('Secret-123', hash)).resolves.toBe(true);
  });
});
