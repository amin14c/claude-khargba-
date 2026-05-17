import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';

// ── Error Boundary for Debugging ───────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ React Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: '#12100E',
          color: '#E6D5B8',
          fontFamily: 'EB Garamond, Georgia, serif',
          padding: '20px',
        }}>
          <h1 style={{ color: '#D4AF37' }}>⚠️ تحذير</h1>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            حدث خطأ في تحميل التطبيق
          </p>
          <pre style={{
            backgroundColor: '#1C1914',
            padding: '15px',
            borderRadius: '4px',
            maxWidth: '500px',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #D4AF37',
          }}>
            {this.state.error?.message}
          </pre>
          <p style={{ fontSize: '12px', marginTop: '20px', opacity: 0.6 }}>
            تحقق من متغيرات البيئة والكونسول (F12) للمزيد من التفاصيل
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Check your index.html file.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
