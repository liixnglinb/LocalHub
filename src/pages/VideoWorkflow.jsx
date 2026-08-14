import React from 'react';
import CanvasFrame from '../components/CanvasFrame';

/**
 * 视频工作流 — 整屏内嵌本地 canvas-app 画布（1:1 保真，不改 UI/逻辑）
 * 无标题栏/无图标，点击进入即为整个画布界面（Layout 对此路由启用全宽模式）。
 */
export default function VideoWorkflow() {
  return <CanvasFrame />;
}
