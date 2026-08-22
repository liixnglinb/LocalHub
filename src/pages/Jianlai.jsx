import React from 'react';

/**
 * Jianlai — 《剑来·开放世界人生模拟器》独立全屏页
 * 游戏为 self-contained 静态页（public/jianlai/index.html），以 iframe 嵌入，
 * 不依赖 React 重写，保持原游戏逻辑完整；localStorage 存档同源可用。
 */
export default function Jianlai() {
  const src = import.meta.env.BASE_URL + 'jianlai/index.html';
  return (
    <iframe
      src={src}
      title="剑来·开放世界人生模拟器"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: '#14110c',
      }}
    />
  );
}
