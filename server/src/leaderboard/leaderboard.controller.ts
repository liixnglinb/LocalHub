import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

// 排行榜接口无鉴权（与原 Express 版一致：config/leaderboard/sync 均开放）
@Controller()
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get('config')
  config() {
    return this.leaderboardService.getConfig();
  }

  // 兼容旧接口名
  @Get('leaderboard/config')
  leaderboardConfig() {
    return this.leaderboardService.getConfig();
  }

  @Get('leaderboard/:tabId')
  tab(@Param('tabId') tabId: string, @Query('search') search?: string) {
    return this.leaderboardService.getTab(tabId, search);
  }

  @Post('sync')
  sync() {
    return this.leaderboardService.sync();
  }
}