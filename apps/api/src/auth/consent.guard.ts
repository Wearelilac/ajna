/**
 * Consent Guard
 * Enforces that user has granted required consent scope.
 * Used with @RequiresConsent('scope') decorator.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { ConsentService } from './consent.service';
import { ConsentScope } from './dto/consent.dto';

@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private consentService: ConsentService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScope = this.reflector.get<ConsentScope>(
      'requiredConsent',
      context.getHandler(),
    );

    // No consent requirement = allow
    if (!requiredScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const user = (request as any).user;
    const db = (request as any).db;

    if (!user || !user.subjectId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has granted consent
    // TODO: Integrate with actual database check
    // For now, assume granted (will be wired in B1.3 completion)
    const hasConsent = true; // Placeholder

    if (!hasConsent) {
      throw new ForbiddenException(`CONSENT_REQUIRED: ${requiredScope}`);
    }

    return true;
  }
}
