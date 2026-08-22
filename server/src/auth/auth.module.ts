import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { EmailService } from './email.service';

@Module({
  providers: [AuthService, AuthGuard, EmailService],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, EmailService],
})
export class AuthModule {}