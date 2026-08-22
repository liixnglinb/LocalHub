import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 全局前缀 /api（API 统一走 Nginx 反代 /api 路径）
  app.setGlobalPrefix('api');

  // 移除 CORS：由 Nginx 反向代理统一处理跨域
  app.enableCors({ origin: false });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '127.0.0.1';

  await app.listen(PORT, HOST);
  console.log(`\n  ============================================`);
  console.log(`    LocalHub 云端后端已启动 (NestJS + Prisma)`);
  console.log(`    地址: ${HOST}:${PORT}`);
  console.log(`  ============================================\n`);
}

bootstrap();