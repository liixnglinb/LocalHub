import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DataModule } from './data/data.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [PrismaModule, AuthModule, DataModule, LeaderboardModule],
})
export class AppModule {}