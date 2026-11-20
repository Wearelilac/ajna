import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { v4 as uuid } from 'uuid';
import { AppError, ERROR_CODES } from './errors';

/**
 * Standard error response shape (00-stack-and-conventions.md, section 4).
 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  requestId: string;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('AppExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Extract or generate request ID
    const requestId = this.getOrGenerateRequestId(request);

    if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      // Handle validation errors
      if (statusCode === HttpStatus.BAD_REQUEST && typeof response === 'object') {
        const data = response as any;
        if (data.message && Array.isArray(data.message)) {
          code = ERROR_CODES.VALIDATION_FAILED;
          message = data.message[0] || 'Validation failed';
        }
      } else if (statusCode === HttpStatus.NOT_FOUND) {
        code = ERROR_CODES.NOT_FOUND;
        message = 'Not found';
      } else if (statusCode === HttpStatus.FORBIDDEN) {
        code = ERROR_CODES.FORBIDDEN;
        message = 'Forbidden';
      } else if (statusCode === HttpStatus.UNAUTHORIZED) {
        code = ERROR_CODES.UNAUTHORIZED;
        message = 'Unauthorized';
      } else {
        message =
          typeof response === 'object' && (response as any).message
            ? (response as any).message
            : exception.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        { requestId },
      );
      message = 'Internal server error';
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      error: HttpStatus[statusCode] || 'Unknown Error',
      code,
      message,
      requestId,
    };

    reply.code(statusCode).send(errorResponse);
  }

  private getOrGenerateRequestId(request: FastifyRequest): string {
    const header = request.headers['x-request-id'];
    if (typeof header === 'string' && this.isValidUuid(header)) {
      return header;
    }
    return uuid();
  }

  private isValidUuid(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}
