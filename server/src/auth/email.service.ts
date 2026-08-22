import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

/** SMTP 发送配置（从 .env 读取） */
interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
}

/** 内存验证码存储：email -> { code, expiresAt } */
interface CodeEntry {
  code: string;
  expiresAt: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private transportError: string | null = null;
  private readonly codes = new Map<string, CodeEntry>();
  private readonly TTL = 10 * 60 * 1000; // 验证码 10 分钟有效
  private readonly COOLDOWN = 60 * 1000; // 60 秒冷却

  constructor() {
    try {
      const cfg = this.readConfig();
      if (!cfg) return; // 未配置 SMTP，跳过
      this.transporter = createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
      });
      this.from = cfg.from;
    } catch (e: any) {
      this.transportError = e?.message || 'SMTP 配置错误';
      this.logger.warn(`SMTP 初始化失败: ${this.transportError}`);
    }
  }

  private from = '';

  private readConfig(): SmtpConfig | null {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    return {
      host,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      user,
      pass,
      secure: process.env.SMTP_SECURE !== 'false' && process.env.SMTP_SECURE !== '0',
      from: process.env.SMTP_FROM || `LocalHub <${user}>`,
    };
  }

  /** 是否已配置 SMTP */
  isConfigured(): boolean {
    return !!this.transporter && !this.transportError;
  }

  /** 清理过期验证码（惰性） */
  private prune(): void {
    const now = Date.now();
    for (const [email, entry] of this.codes) {
      if (entry.expiresAt < now) this.codes.delete(email);
    }
  }

  /** 发送验证码到指定邮箱，返回是否成功发送 */
  async sendCode(email: string): Promise<{ sent: boolean; reason?: string }> {
    if (!this.transporter) {
      return { sent: false, reason: this.transportError || '邮件服务未配置' };
    }

    this.prune();
    const now = Date.now();
    const existing = this.codes.get(email);
    if (existing && existing.expiresAt - now > this.TTL - this.COOLDOWN) {
      return { sent: false, reason: '发送过于频繁，请 60 秒后重试' };
    }

    // 生成 6 位验证码并存储
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.codes.set(email, { code, expiresAt: now + this.TTL });

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'LocalHub 邮箱验证码',
        text: `你的 LocalHub 验证码是：${code}，10 分钟内有效。若非本人操作请忽略。`,
        html: `
          <div style="font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;border-radius:16px;border:1px solid #eef0f4;">
            <div style="font-size:18px;font-weight:700;color:#1a1d24;margin-bottom:16px;">LocalHub · 邮箱验证码</div>
            <div style="font-size:14px;color:#5b6472;line-height:1.6;margin-bottom:20px;">
              你好，你正在注册或验证 LocalHub 账号。请使用以下验证码完成操作。
            </div>
            <div style="display:inline-block;padding:14px 28px;background:#f4f5f9;border-radius:12px;font-size:32px;font-weight:800;letter-spacing:8px;color:#7c5cff;">
              ${code}
            </div>
            <div style="margin-top:20px;font-size:12px;color:#9aa1ad;line-height:1.6;">
              验证码 10 分钟内有效。若非本人操作，请忽略此邮件。
            </div>
          </div>
        `,
      });
      this.logger.log(`验证码已发送至 ${email}`);
      return { sent: true };
    } catch (e: any) {
      this.logger.error(`验证码发送失败 ${email}: ${e?.message}`);
      this.codes.delete(email);
      return { sent: false, reason: e?.message || '邮件发送失败' };
    }
  }

  /** 校验验证码（校验通过即删除，防止复用） */
  verifyCode(email: string, code: string): boolean {
    this.prune();
    const entry = this.codes.get(email);
    if (!entry) return false;
    if (entry.code !== code.trim()) return false;
    this.codes.delete(email);
    return true;
  }

  /** 注册时校验验证码；未配置 SMTP 时跳过（开发环境放行） */
  assertCode(email: string, code: string): void {
    if (!this.isConfigured()) return; // 未配置邮件服务则跳过验证
    if (!code) throw new BadRequestException('请输入邮箱验证码');
    if (!this.verifyCode(email, code)) {
      throw new BadRequestException('验证码错误或已过期');
    }
  }
}