import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import type { ApiError } from './api-response.js';

/** Thrown by the validation pipe so field errors survive to the client. */
export class ValidationFailedException extends HttpException {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super('Validation failed', HttpStatus.BAD_REQUEST);
  }
}

const MULTER_MESSAGES: Record<string, [number, string]> = {
  LIMIT_FILE_SIZE: [HttpStatus.PAYLOAD_TOO_LARGE, 'One of the images is too large'],
  LIMIT_FILE_COUNT: [HttpStatus.BAD_REQUEST, 'Too many images in one upload'],
  LIMIT_UNEXPECTED_FILE: [HttpStatus.BAD_REQUEST, 'Unexpected file field'],
  LIMIT_PART_COUNT: [HttpStatus.BAD_REQUEST, 'Too many form fields'],
};

/** Converts every error into `{ success: false, statusCode, message, errors? }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiError {
    if (exception instanceof ValidationFailedException) {
      return { success: false, statusCode: 400, message: 'Validation failed', errors: exception.fieldErrors };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      let message = exception.message;
      if (typeof response === 'object' && response && 'message' in response) {
        const m = (response as { message: unknown }).message;
        message = Array.isArray(m) ? m.join(', ') : String(m);
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) message = 'Too many requests. Please wait a moment and try again.';
      return { success: false, statusCode: status, message };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') return { success: false, statusCode: 404, message: 'Record not found' };
      if (exception.code === 'P2002') return { success: false, statusCode: 409, message: 'A record with this value already exists' };
      if (exception.code === 'P2003') return { success: false, statusCode: 400, message: 'Related record not found' };
    }

    const code = (exception as { code?: string })?.code;
    if (code && MULTER_MESSAGES[code]) {
      const [statusCode, message] = MULTER_MESSAGES[code];
      return { success: false, statusCode, message };
    }

    return { success: false, statusCode: 500, message: 'Something went wrong. Please try again.' };
  }
}
