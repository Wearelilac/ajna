/**
 * Requires Consent Decorator
 * Enforces that a user has granted consent for a scope before proceeding.
 * Use: @RequiresConsent('wearable')
 */

import { SetMetadata } from '@nestjs/common';
import { ConsentScope } from './dto/consent.dto';

export const RequiresConsent = (scope: ConsentScope) =>
  SetMetadata('requiredConsent', scope);
