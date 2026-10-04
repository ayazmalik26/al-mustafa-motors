/**
 * Creates (or resets the password of) an admin/staff user.
 *
 *   npm run admin:create -- --email owner@example.com --name "Owner" --password "a-strong-password" [--role STAFF]
 *
 * Use this in production instead of the development seed accounts.
 */
import { config } from 'dotenv';
import { parseArgs } from 'node:util';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma/client.js';

config({ path: ['.env', '../.env'], quiet: true });

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
    role: { type: 'string', default: 'ADMIN' },
  },
});

const email = values.email?.trim().toLowerCase();
const password = values.password ?? '';
const role = (values.role ?? 'ADMIN').toUpperCase() as Role;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Provide a valid --email');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Provide a --password of at least 10 characters');
  process.exit(1);
}
if (!Object.values(Role).includes(role)) {
  console.error(`--role must be one of ${Object.values(Role).join(', ')}`);
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const passwordHash = await bcrypt.hash(password, 12);
const user = await prisma.user.upsert({
  where: { email },
  create: { email, name: values.name?.trim() || email, passwordHash, role },
  update: { passwordHash, role, isActive: true, ...(values.name && { name: values.name.trim() }) },
});
console.log(`✔ ${user.role} account ready: ${user.email}`);
await prisma.$disconnect();
