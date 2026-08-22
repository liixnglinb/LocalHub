import {
  Injectable,
  OnModuleInit,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const SALT_ROUNDS = 100000; // PBKDF2 迭代次数

@Injectable()
export class AuthService implements OnModuleInit {
  private currentToken: string | null = null;

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async onModuleInit() {
    await this.initSettings();
  }

  // ---- 密码 hash / 校验 ----
  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, SALT_ROUNDS, 32, 'sha256').toString('hex');
    return salt + ':' + hash;
  }

  private verifyPassword(input: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const derived = crypto.pbkdf2Sync(input, salt, SALT_ROUNDS, 32, 'sha256').toString('hex');
    return derived === hash;
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // 生成会话 token（含用户 id，签名后返回）
  private signSessionToken(userId: string): string {
    const payload = { uid: userId, t: Date.now() };
    const secret = process.env.JWT_SECRET || 'localhub-default-secret';
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  // 校验会话 token 并返回 userId，非法返回 null
  verifySessionToken(token: string): string | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const secret = process.env.JWT_SECRET || 'localhub-default-secret';
    const expect = crypto.createHmac('sha256', secret).update(body).digest('base64url');
    if (sig !== expect) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      // 过期校验：30 天有效期（一个月内自动登录）
      if (!payload.uid || Date.now() - payload.t > 30 * 24 * 3600 * 1000) return null;
      return payload.uid;
    } catch {
      return null;
    }
  }

  // 初始化：仅保留兼容旧逻辑，不再依赖单密码（保留 settings 表密码仅作兼容）
  async initSettings(): Promise<void> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'password' } });
    const envPwd = process.env.LH_PASSWORD;
    if (!row && envPwd) {
      await this.prisma.setting.upsert({
        where: { key: 'password' },
        update: {},
        create: { key: 'password', value: this.hashPassword(envPwd) },
      });
    }
    if (!this.currentToken) this.currentToken = this.generateToken();
  }

  async getInitStatus() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'password' } });
    return { initialized: !!row, hasToken: !!this.currentToken };
  }

  // ============ 多用户：邮箱注册 ============
  async register(
    email: string,
    password: string,
    code?: string,
  ): Promise<{ ok: boolean; token: string; user: unknown }> {
    if (!email || !password) throw new BadRequestException('请提供邮箱和密码');
    email = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('邮箱格式不正确');
    if (password.length < 6) throw new BadRequestException('密码至少 6 位');

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ForbiddenException('该邮箱已注册，请直接登录');

    // 校验邮箱验证码（未配置邮件服务时跳过）
    this.emailService.assertCode(email, code || '');

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: this.hashPassword(password),
        displayName: email.split('@')[0],
      },
    });

    const token = this.signSessionToken(user.id);
    return { ok: true, token, user: this.toPublic(user) };
  }

  // ============ 多用户：邮箱登录 ============
  async login(email: string, password: string): Promise<{ ok: boolean; token: string; user: unknown }> {
    if (!email || !password) throw new BadRequestException('请提供邮箱和密码');
    email = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new ForbiddenException('邮箱或密码错误');
    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new ForbiddenException('邮箱或密码错误');
    }
    const token = this.signSessionToken(user.id);
    return { ok: true, token, user: this.toPublic(user) };
  }

  // ============ 邮箱验证码登录（输入验证码直接登录，无需密码） ============
  async loginWithCode(email: string, code: string): Promise<{ ok: boolean; token: string; user: unknown }> {
    if (!email || !code) throw new BadRequestException('请提供邮箱和验证码');
    email = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('邮箱格式不正确');

    // 校验验证码（未配置 SMTP 时跳过）
    this.emailService.assertCode(email, code);

    // 找到或创建用户（验证码登录自动建号）
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: email.split('@')[0],
        },
      });
    }

    const token = this.signSessionToken(user.id);
    return { ok: true, token, user: this.toPublic(user) };
  }

  // ============ GitHub OAuth：用 code 换取用户 ============
  async githubLogin(code: string): Promise<{ ok: boolean; token: string; user: unknown }> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new InternalServerErrorException('GitHub 登录未配置');

    // 用 code 换 access_token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    }).catch(() => null);
    if (!tokenRes || !tokenRes.ok) throw new UnauthorizedException('GitHub 授权失败');
    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new UnauthorizedException('GitHub 授权失败');

    // 拉取 GitHub 用户信息
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    }).catch(() => null);
    if (!userRes || !userRes.ok) throw new UnauthorizedException('获取 GitHub 用户失败');
    const gh = await userRes.json();

    // 按 githubId 查找或创建用户
    let user = await this.prisma.user.findUnique({ where: { githubId: String(gh.id) } });
    if (!user) {
      // 若该 GitHub 邮箱已被邮箱注册，则绑定
      const ghEmail: any = (gh.email) ? String(gh.email).toLowerCase() : null;
      const byEmail = ghEmail ? await this.prisma.user.findUnique({ where: { email: ghEmail } }) : null;
      user = byEmail && !byEmail.githubId
        ? await this.prisma.user.update({
            where: { id: byEmail.id },
            data: { githubId: String(gh.id), githubLogin: gh.login, avatarUrl: gh.avatar_url, displayName: gh.name || gh.login },
          })
        : await this.prisma.user.create({
            data: {
              githubId: String(gh.id),
              githubLogin: gh.login,
              displayName: gh.name || gh.login,
              avatarUrl: gh.avatar_url,
              email: ghEmail || undefined,
            },
          });
    }

    const token = this.signSessionToken(user.id);
    return { ok: true, token, user: this.toPublic(user) };
  }

  // 通过 userId 获取用户公开信息
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toPublic(user) : null;
  }

  private toPublic(u: any) {
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      githubLogin: u.githubLogin,
      createdAt: u.createdAt,
    };
  }

  // ============ 兼容旧单密码登录（保留，供旧客户端） ============
  async legacyLogin(password: string): Promise<{ ok: boolean; token: string }> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'password' } });
    if (!row) throw new InternalServerErrorException('系统未初始化');
    if (!this.verifyPassword(password, row.value)) {
      throw new ForbiddenException('密码错误');
    }
    const token = this.signSessionToken('migrated-admin');
    return { ok: true, token };
  }

  validateToken(token: string): boolean {
    return this.verifySessionToken(token) !== null;
  }

  // 从 token 解析 userId（供数据服务使用）
  getUserIdFromToken(token: string): string | null {
    return this.verifySessionToken(token);
  }
}