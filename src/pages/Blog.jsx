import React from 'react';

/** 个人博客 · Blog：全屏嵌入独立博客 SPA（/blog/）
 *  src 带版本参数，强制绕过浏览器/CDN 对 /blog/ 的缓存，确保加载最新版博客。 */
export default function Blog() {
  const src = (import.meta.env.VITE_BLOG_URL || '/blog/') + '?v=4';

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', background: '#FFFFFF' }}>
      <iframe
        src={src}
        title="个人博客"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#FFFFFF' }}
      />
    </div>
  );
}