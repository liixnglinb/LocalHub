import React from 'react';

/**
 * ErrorBoundary — 捕获渲染异常，防止整个应用白屏/黑屏。
 * 子组件渲染崩溃时显示错误卡片而不是黑屏，并提供"重试"。
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass p-6 m-4" style={{ maxWidth: 520 }}>
          <div className="text-[14px] font-semibold text-[var(--warn)] mb-2">⚠️ 页面渲染出现异常</div>
          <div className="text-[12px] text-[var(--text-2)] mono whitespace-pre-wrap break-all" style={{ fontFamily: 'var(--font-mono)' }}>
            {this.state.message}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="btn btn-primary text-xs mt-4"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
