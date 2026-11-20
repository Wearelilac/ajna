import { z } from 'zod';
import { ZodDto } from 'nestjs-zod';

export const ConsentScopeEnum = z.enum(['wearable', 'monitor_me', 'population_use']);
export type ConsentScope = z.infer<typeof ConsentScopeEnum>;

export const GetConsentsResponseSchema = z.object({
  consents: z.array(
    z.object({
      scope: ConsentScopeEnum,
      granted: z.boolean(),
      textVersion: z.string(),
      grantedAt: z.string().datetime().nullable(),
      revokedAt: z.string().datetime().nullable(),
    }),
  ),
});

export class GetConsentsResponseDto extends ZodDto(GetConsentsResponseSchema) {}

export const UpdateConsentRequestSchema = z.object({
  granted: z.boolean(),
  textVersion: z.string(),
});

export class UpdateConsentRequestDto extends ZodDto(UpdateConsentRequestSchema) {}

export const UpdateConsentResponseSchema = z.object({
  scope: ConsentScopeEnum,
  granted: z.boolean(),
  textVersion: z.string(),
  grantedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});

export class UpdateConsentResponseDto extends ZodDto(UpdateConsentResponseSchema) {}
