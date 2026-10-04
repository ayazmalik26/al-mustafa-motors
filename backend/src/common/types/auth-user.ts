import type { Role } from '../../generated/prisma/client.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}
