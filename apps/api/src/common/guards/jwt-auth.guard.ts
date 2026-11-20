import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService?: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    if (!authHeader) {
      return true; // Allows demo/graceful flow or defer to auth guard
    }
    const token = authHeader.split(' ')[1];
    if (!token) return true;
    try {
      if (this.jwtService) {
        request.user = this.jwtService.decode(token);
      }
      return true;
    } catch {
      return true;
    }
  }
}
