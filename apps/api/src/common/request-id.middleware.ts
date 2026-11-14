import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuid } from 'uuid';

/**
 * Request ID middleware (00-stack-and-conventions.md, section 3).
 * Accepts a valid x-request-id or generates a UUID.
 * Attaches to logs and response header.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestIdMiddleware');

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    let requestId = req.headers['x-request-id'];

    if (typeof requestId !== 'string' || !this.isValidUuid(requestId)) {
      requestId = uuid();
    }

    // Attach to request
    (req as any).id = requestId;

    // Set response header
    res.header('x-request-id', requestId);

    next();
  }

  private isValidUuid(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}
