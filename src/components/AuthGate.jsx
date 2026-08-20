import React from 'react';

/** AuthGate — 个人自用模式：不做登录，直接渲染页面。
 *  保留统一的 user 约定，方便 Dashboard 等页面显示"欢迎"信息。
 */
export default function AuthGate({ children }) {
  const user = { id: 'local', email: '', displayName: '用户', avatarUrl: null };
  const onLogout = null;
  return children({ onLogout, user });
}