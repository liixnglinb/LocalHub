import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { userId?: string }>();
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const userId = this.authService.getUserIdFromToken(token);
    if (!userId) {
      throw new UnauthorizedException('未授权，请先登录');
    }
    // 把 userId 挂到 request 上，供控制器/数据服务使用
    (req as any).userId = userId;
    return true;
  }
}