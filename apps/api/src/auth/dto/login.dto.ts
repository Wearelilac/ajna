import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
});

export class LoginRequestDto extends createZodDto(LoginRequestSchema) {}

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    subjectId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['app_user', 'app_reviewer', 'app_official']),
  }),
});

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}

export const RefreshRequestSchema = z.object({
  refreshToken: z.string(),
});

export class RefreshRequestDto extends createZodDto(RefreshRequestSchema) {}

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export class RefreshResponseDto extends createZodDto(RefreshResponseSchema) {}
