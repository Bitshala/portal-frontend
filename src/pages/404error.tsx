interface MyErrorProps {
  code?: number | string;
  label?: string;
}

const MyError = ({ code = 404, label }: MyErrorProps) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        fontFamily: 'Sora, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', color: '#111827' }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
          {label ?? code}
        </div>
      </div>
    </div>
  );
};

export default MyError;
