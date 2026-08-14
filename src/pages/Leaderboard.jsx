import React from 'react';
import LeaderboardFrame from '../components/LeaderboardFrame';

/** AI 模型排行榜页：独立入口，加载本地 leaderboard 服务（BenchLM 数据） */
export default function Leaderboard() {
  return <LeaderboardFrame />;
}
