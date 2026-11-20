/**
 * B5.1: Rate Limiting Middleware
 */

import { Injectable, NestMiddleware } from '@nestjs/common';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};

  // Clean up old entries every 5 minutes
  constructor() {
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  use(req: any, res: any, next: () => void) {
    const key = this.getKey(req);
    const limit = this.getLimit(req);
    const window = this.getWindow(req);

    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetAt) {
      // New window
      this.store[key] = {
        count: 1,
        resetAt: now + window,
      };
      this.setHeaders(res, limit, limit - 1, Math.ceil((now + window - now) / 1000));
      return next();
    }

    // Existing window
    entry.count++;

    if (entry.count > limit) {
      // Rate limit exceeded
      this.setHeaders(res, limit, 0, Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      });
    }

    this.setHeaders(res, limit, limit - entry.count, Math.ceil((entry.resetAt - now) / 1000));
    next();
  }

  private getKey(req: any): string {
    const ip = req?.ip || req?.socket?.remoteAddress || 'unknown';
    const endpoint = req?.path || req?.url || '';
    return `${ip}:${endpoint}`;
  }

  private getLimit(req: any): number {
    const path = req?.path || req?.url || '';
    if (path.includes('/batch')) {
      return 100;
    }
    return 60;
  }

  private getWindow(req: any): number {
    const path = req?.path || req?.url || '';
    if (path.includes('/batch')) {
      return 60 * 60 * 1000;
    }
    return 60 * 1000;
  }

  private setHeaders(res: any, limit: number, remaining: number, resetIn: number) {
    if (res?.setHeader) {
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetIn);
    }
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetAt < now) {
        delete this.store[key];
      }
    });
  }
}
