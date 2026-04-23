import React from 'react';
import * as Sentry from '@sentry/react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    Sentry.captureException(error, { extra: info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: 24,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--text)',
              marginBottom: 10,
            }}>
              문제가 발생했어요
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 24 }}>
              일시적인 오류가 발생했습니다.<br />
              페이지를 새로고침하면 해결될 수 있어요.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              새로고침
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: 'none',
                color: 'var(--text3)',
                border: 'none',
                borderRadius: 'var(--radius)',
                padding: '10px 24px',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginLeft: 8,
              }}
            >
              홈으로
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre style={{
                marginTop: 24,
                padding: 12,
                background: 'var(--bg2)',
                borderRadius: 'var(--radius)',
                fontSize: 11,
                color: 'var(--text3)',
                textAlign: 'left',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
