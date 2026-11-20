import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

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

export class GetConsentsResponseDto extends createZodDto(GetConsentsResponseSchema) {}

export const UpdateConsentRequestSchema = z.object({
  granted: z.boolean(),
  textVersion: z.string(),
});

export class UpdateConsentRequestDto extends createZodDto(UpdateConsentRequestSchema) {}

export const UpdateConsentResponseSchema = z.object({
  scope: ConsentScopeEnum,
  granted: z.boolean(),
  textVersion: z.string(),
  grantedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
});

export class UpdateConsentResponseDto extends createZodDto(UpdateConsentResponseSchema) {}
