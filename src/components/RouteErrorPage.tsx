import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

// Friendly fallback shown when a route throws during render/loading. Wired up
// as `errorElement` on every route in main.tsx so users never see React
// Router's raw developer error screen. Styled to match the fellowship dark UI.
const RouteErrorPage = () => {
  const error = useRouteError();

  let heading = 'Something went wrong';
  let detail = 'An unexpected error occurred while loading this page.';

  if (isRouteErrorResponse(error)) {
    heading = `${error.status} ${error.statusText}`;
    detail = error.data?.message ?? detail;
  } else if (error instanceof Error) {
    detail = error.message;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0e0e10',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#fafafa',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(249,115,22,0.12)',
            color: '#fb923c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <AlertTriangle size={26} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{heading}</h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: '#a1a1aa',
            margin: '0 0 24px',
            wordBreak: 'break-word',
          }}
        >
          {detail}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: '#f97316',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={15} />
            Reload page
          </button>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid #3f3f46',
              background: 'transparent',
              color: '#fafafa',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Home size={15} />
            Go home
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteErrorPage;
