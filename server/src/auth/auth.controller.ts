import { Controller, Get, Post, Body, Request, UseGuards, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  // 查询初始化状态（不校验 token）
  @Get('init')
  async init() {
    const status = await this.authService.getInitStatus();
    return {
      ...status,
      githubEnabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      emailEnabled: this.emailService.isConfigured(),
    };
  }

  // ============ 发送邮箱验证码 ============
  @Post('send-code')
  async sendCode(@Body() body: { email?: string }) {
    const email = (body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: '邮箱格式不正确' };
    }
    const result = await this.emailService.sendCode(email);
    if (result.sent) return { ok: true };
    // 未配置 SMTP 时返回可识别状态，前端提示
    if (!this.emailService.isConfigured()) {
      return { ok: false, error: '邮件服务未配置，暂不支持邮箱验证码', unconfigured: true };
    }
    return { ok: false, error: result.reason || '发送失败' };
  }

  // ============ 多用户：邮箱注册 ============
  @Post('register')
  async register(@Body() body: { email?: string; password?: string; code?: string }) {
    return this.authService.register(body.email || '', body.password || '', body.code || '');
  }

  // ============ 多用户：邮箱登录 ============
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    return this.authService.login(body.email || '', body.password || '');
  }

  // ============ 邮箱验证码登录（免密） ============
  @Post('login-with-code')
  async loginWithCode(@Body() body: { email?: string; code?: string }) {
    return this.authService.loginWithCode(body.email || '', body.code || '');
  }

  // ============ 兼容旧单密码登录（供旧客户端找回） ============
  @Post('legacy-login')
  async legacyLogin(@Body() body: { password?: string }) {
    if (!body.password) return { error: '请输入密码' };
    return this.authService.legacyLogin(body.password);
  }

  // ============ GitHub OAuth：发起登录（跳转 GitHub） ============
  @Get('github')
  async githubRedirect(@Res() res: Response) {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI || '';
    if (!clientId) {
      return res.status(500).send({ error: 'GitHub 登录未配置' });
    }
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user%20user:email&${
      redirectUri ? `redirect_uri=${encodeURIComponent(redirectUri)}&` : ''
    }state=localhub`;
    return res.redirect(url);
  }

  // ============ GitHub OAuth：回调（code 换用户） ============
  @Get('github/callback')
  async githubCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      const result = await this.authService.githubLogin(code);
      // 前端通过 localStorage 读取 token：把 token 放 URL hash，由前端读取
      const data = encodeURIComponent(JSON.stringify(result));
      const frontendUrl = process.env.GITHUB_FRONTEND_URL || '/';
      return res.redirect(`${frontendUrl}#github=${data}`);
    } catch (e: any) {
      const frontendUrl = process.env.GITHUB_FRONTEND_URL || '/';
      return res.redirect(`${frontendUrl}?github=error&msg=${encodeURIComponent(e.message || '登录失败')}`);
    }
  }

  // ============ 获取当前用户信息（需 token） ============
  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Request() req: any) {
    return this.authService.getUserById(req.userId);
  }
}