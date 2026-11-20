import { z } from 'zod';
import { ZodDto } from 'nestjs-zod';

/**
 * User registration request.
 * Email + password (minimum 12 chars).
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)'),
});

export class RegisterRequestDto extends ZodDto(RegisterRequestSchema) {}

/**
 * Registration response.
 * Returns tokens and user info (no password).
 */
export const RegisterResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    subjectId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['app_user', 'app_reviewer', 'app_official']),
  }),
});

export class RegisterResponseDto extends ZodDto(RegisterResponseSchema) {}
