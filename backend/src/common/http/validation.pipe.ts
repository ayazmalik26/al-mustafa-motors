import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ValidationFailedException } from './all-exceptions.filter.js';

function flatten(errors: ValidationError[], parent = '', out: Record<string, string[]> = {}) {
  for (const err of errors) {
    const path = parent ? `${parent}.${err.property}` : err.property;
    if (err.constraints) out[path] = Object.values(err.constraints);
    if (err.children?.length) flatten(err.children, path, out);
  }
  return out;
}

/** Global DTO validation: strips unknown fields, rejects extra ones, converts types. */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors) => new ValidationFailedException(flatten(errors)),
  });
}
