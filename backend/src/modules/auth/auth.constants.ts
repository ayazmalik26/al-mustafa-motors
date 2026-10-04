import bcrypt from 'bcryptjs';

export const SESSION_COOKIE = 'am_session';

let dummyHash: string | undefined;
/** A real bcrypt hash compared against when the email is unknown, so timing does not reveal valid emails. */
export function dummyPasswordHash(): string {
  dummyHash ??= bcrypt.hashSync('not-a-real-password', 12);
  return dummyHash;
}
