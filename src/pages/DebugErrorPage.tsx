import { useMemo, useState } from 'react';
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useRouteError } from 'react-router-dom';
import {
  AlertTriangle,
  Bug,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Lightbulb,
  RotateCcw,
} from 'lucide-react';

interface DebugErrorPageProps {
  error?: unknown;
  componentStack?: string;
  onReset?: () => void;
}

interface Frame {
  fn: string;
  url: string;
  shortFile: string;
  line: number;
  col: number;
  isUserCode: boolean;
}

// Matches stack frames produced by V8/Chrome:
//   "    at TrackStep (http://localhost:5173/src/pages/fellowship/Apply.tsx?t=123:656:124)"
//   "    at http://localhost:5173/.vite/deps/react.js:42:10"
const FRAME_WITH_FN = /^\s*at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)\s*$/;
const FRAME_NO_FN = /^\s*at\s+(.+?):(\d+):(\d+)\s*$/;

const parseStack = (stack: string): Frame[] => {
  const frames: Frame[] = [];
  for (const raw of stack.split('\n')) {
    let fn = '<anonymous>';
    let url = '';
    let line = 0;
    let col = 0;
    const m1 = raw.match(FRAME_WITH_FN);
    if (m1) {
      fn = m1[1];
      url = m1[2];
      line = Number(m1[3]);
      col = Number(m1[4]);
    } else {
      const m2 = raw.match(FRAME_NO_FN);
      if (!m2) continue;
      url = m2[1];
      line = Number(m2[2]);
      col = Number(m2[3]);
    }
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    const shortFile = parts.slice(-3).join('/');
    const isUserCode =
      /\/src\//.test(cleanUrl) &&
      !/node_modules/.test(cleanUrl) &&
      !/\.vite\/deps/.test(cleanUrl);
    frames.push({ fn, url: cleanUrl, shortFile, line, col, isUserCode });
  }
  return frames;
};

interface Explainer {
  friendly: string;
  tips: string[];
}

const EXPLAINERS: Record<string, Explainer> = {
  ReferenceError: {
    friendly:
      "You're using a name that doesn't exist in scope — usually a typo, a missing import, or something you renamed/deleted but still reference somewhere.",
    tips: [
      'Check the spelling of the symbol in the first user-code frame below.',
      'If you recently renamed or removed it, search the project for the old name.',
      'If it should come from an import, confirm the import statement is present.',
    ],
  },
  TypeError: {
    friendly:
      "You called a method or read a property on a value that wasn't what you expected — most often `undefined` or `null`.",
    tips: [
      'Log the value right before the failing line to see what it actually is.',
      'Add a guard (`if (foo) foo.bar()`) or use optional chaining (`foo?.bar?.()`).',
      "If it's a destructure, the source object may be missing the key entirely.",
    ],
  },
  SyntaxError: {
    friendly:
      "The parser couldn't read your file. Usually a typo, a mismatched bracket, or a stray character.",
    tips: [
      'Look at the line/column the error mentions — the actual cause is often a line or two above.',
      'Check braces `{}`, parens `()`, JSX tags, and trailing commas.',
    ],
  },
  RangeError: {
    friendly:
      'A value is outside an allowed range — often infinite recursion or an array size that exploded.',
    tips: [
      "If it says 'Maximum call stack size exceeded', find a function that calls itself unconditionally.",
      'If it involves an array, verify the length you computed is finite and positive.',
    ],
  },
  AxiosError: {
    friendly:
      "An HTTP request failed. The backend either returned an error status, the request timed out, or the network couldn't reach it.",
    tips: [
      'Open the Network tab to see the request URL, status, and response body.',
      'Check that VITE_API_BASE_URL points to a running server.',
      "If status is 401/403, the auth token is missing or expired.",
    ],
  },
};

const extractName = (err: unknown): string => {
  if (err instanceof Error) return err.name || 'Error';
  if (typeof err === 'object' && err && 'name' in err && typeof (err as { name?: unknown }).name === 'string') {
    return (err as { name: string }).name;
  }
  return 'Error';
};

const extractMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
    try {
      return JSON.stringify(err, null, 2);
    } catch {
      return String(err);
    }
  }
  return String(err);
};

const extractStack = (err: unknown): string => {
  if (err instanceof Error && err.stack) return err.stack;
  if (typeof err === 'object' && err && 'stack' in err) {
    const s = (err as { stack?: unknown }).stack;
    if (typeof s === 'string') return s;
  }
  return '';
};

const RouteDebugErrorPage = () => {
  const err = useRouteError();
  return <DebugErrorPage error={err} />;
};

const DebugErrorPage = ({ error, componentStack, onReset }: DebugErrorPageProps) => {
  const name = extractName(error);
  const message = extractMessage(error);
  const stack = extractStack(error);
  const frames = useMemo(() => parseStack(stack), [stack]);
  const firstUserFrame = frames.find((f) => f.isUserCode) ?? frames[0];
  const explainer = EXPLAINERS[name];

  const [showAllFrames, setShowAllFrames] = useState(false);
  const [showComponentStack, setShowComponentStack] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const visibleFrames = showAllFrames ? frames : frames.filter((f) => f.isUserCode).slice(0, 5);
  const hiddenCount = frames.length - visibleFrames.length;

  const handleCopy = async () => {
    const payload = [
      `${name}: ${message}`,
      stack ? `\n${stack}` : '',
      componentStack ? `\n\nComponent stack:${componentStack}` : '',
    ].join('');
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleReload = () => {
    if (onReset) {
      onReset();
      return;
    }
    window.location.reload();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0e0e10',
        color: '#fafafa',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
          <Box sx={{ color: '#f87171' }}>
            <Bug size={18} />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: '#a1a1aa',
              letterSpacing: 1.4,
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.72rem',
            }}
          >
            Debug Page
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
          <Box sx={{ pt: '6px', color: '#f87171' }}>
            <AlertTriangle size={24} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f87171' }}>
                {name}
              </Typography>
              {firstUserFrame && (
                <Chip
                  label={`${firstUserFrame.shortFile}:${firstUserFrame.line}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(248,113,113,0.12)',
                    color: '#fca5a5',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: '1px solid rgba(248,113,113,0.25)',
                  }}
                />
              )}
            </Stack>
            <Typography
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.95rem',
                color: '#fafafa',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2.5, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RotateCcw size={14} />}
            onClick={handleReload}
            sx={{ color: '#fafafa', borderColor: '#3f3f46', textTransform: 'none' }}
          >
            Reload
          </Button>
          <Tooltip title={copied ? 'Copied!' : 'Copy error + stack'} placement="top">
            <Button
              variant="outlined"
              startIcon={<Copy size={14} />}
              onClick={handleCopy}
              sx={{ color: '#fafafa', borderColor: '#3f3f46', textTransform: 'none' }}
            >
              {copied ? 'Copied' : 'Copy details'}
            </Button>
          </Tooltip>
        </Stack>

        {explainer && (
          <Section
            icon={<Lightbulb size={14} color="#fbbf24" />}
            title="What this usually means"
          >
            <Typography sx={{ color: '#e4e4e7', lineHeight: 1.55, mb: 1.5 }}>
              {explainer.friendly}
            </Typography>
            <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, m: 0 }}>
              {explainer.tips.map((tip) => (
                <Typography
                  component="li"
                  key={tip}
                  sx={{ color: '#a1a1aa', fontSize: '0.88rem', lineHeight: 1.5 }}
                >
                  {tip}
                </Typography>
              ))}
            </Stack>
          </Section>
        )}

        {firstUserFrame && (
          <Section
            icon={<Code2 size={14} color="#fb923c" />}
            title="Where in your code"
          >
            <FrameRow frame={firstUserFrame} highlight />
            <Typography variant="caption" sx={{ color: '#71717a', display: 'block', mt: 1.25 }}>
              First frame inside <code>/src/</code> (most likely cause).
            </Typography>
          </Section>
        )}

        {frames.length > 0 && (
          <Section
            icon={<ChevronDown size={14} color="#a1a1aa" />}
            title="Stack trace"
            action={
              <Button
                size="small"
                onClick={() => setShowAllFrames((v) => !v)}
                sx={{ color: '#a1a1aa', textTransform: 'none', fontSize: '0.78rem' }}
              >
                {showAllFrames
                  ? 'Hide library frames'
                  : hiddenCount > 0
                    ? `Show all (${frames.length})`
                    : 'Show all'}
              </Button>
            }
          >
            <Stack spacing={0.25}>
              {visibleFrames.map((f, i) => (
                <FrameRow key={`${f.url}:${f.line}:${f.col}:${i}`} frame={f} />
              ))}
              {!showAllFrames && hiddenCount > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: '#52525b', fontStyle: 'italic', mt: 0.5, fontSize: '0.74rem' }}
                >
                  {hiddenCount} library frame{hiddenCount === 1 ? '' : 's'} hidden
                </Typography>
              )}
            </Stack>
          </Section>
        )}

        {componentStack && (
          <Section
            icon={
              showComponentStack ? (
                <ChevronDown size={14} color="#a1a1aa" />
              ) : (
                <ChevronRight size={14} color="#a1a1aa" />
              )
            }
            title="React component tree"
            onTitleClick={() => setShowComponentStack((v) => !v)}
          >
            {showComponentStack && (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  bgcolor: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: 0.5,
                  color: '#d4d4d8',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '0.78rem',
                  lineHeight: 1.55,
                  overflowX: 'auto',
                }}
              >
                {componentStack.trim()}
              </Box>
            )}
          </Section>
        )}

        <Section
          icon={
            showRaw ? (
              <ChevronDown size={14} color="#a1a1aa" />
            ) : (
              <ChevronRight size={14} color="#a1a1aa" />
            )
          }
          title="Raw stack"
          onTitleClick={() => setShowRaw((v) => !v)}
        >
          {showRaw && (
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: '#09090b',
                border: '1px solid #27272a',
                borderRadius: 0.5,
                color: '#a1a1aa',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.74rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {stack || '(no stack)'}
            </Box>
          )}
        </Section>
      </Box>
    </Box>
  );
};

const Section = ({
  icon,
  title,
  action,
  children,
  onTitleClick,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  onTitleClick?: () => void;
}) => (
  <Box
    sx={{
      border: '1px solid #27272a',
      borderRadius: 0.75,
      bgcolor: '#19191d',
      p: { xs: 2, md: 2.5 },
      mb: 2,
    }}
  >
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: children ? 1.5 : 0, cursor: onTitleClick ? 'pointer' : 'default' }}
      onClick={onTitleClick}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon}
        <Typography
          variant="caption"
          sx={{
            color: '#a1a1aa',
            letterSpacing: 1.2,
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: '0.7rem',
          }}
        >
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
    {children}
  </Box>
);

const FrameRow = ({ frame, highlight }: { frame: Frame; highlight?: boolean }) => {
  const openInEditor = () => {
    // Vite serves an `/__open-in-editor` endpoint when configured.
    const target = `/__open-in-editor?file=${encodeURIComponent(frame.url.replace(window.location.origin, ''))}:${frame.line}:${frame.col}`;
    fetch(target).catch(() => {});
  };
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{
        p: 1,
        borderRadius: 0.5,
        bgcolor: highlight ? 'rgba(251,146,60,0.06)' : 'transparent',
        border: highlight ? '1px solid rgba(251,146,60,0.2)' : '1px solid transparent',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: frame.isUserCode ? '#fb923c' : '#3f3f46',
        }}
      />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.82rem',
            color: '#e4e4e7',
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {frame.fn}
        </Typography>
        <Typography
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.72rem',
            color: '#71717a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {frame.shortFile}:{frame.line}:{frame.col}
        </Typography>
      </Box>
      {frame.isUserCode && (
        <Tooltip title="Open in editor (Vite)" placement="top">
          <IconButton
            size="small"
            onClick={openInEditor}
            sx={{
              color: '#71717a',
              '&:hover': { color: '#fb923c', bgcolor: 'rgba(251,146,60,0.08)' },
            }}
          >
            <ExternalLink size={13} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

export default DebugErrorPage;
export { RouteDebugErrorPage };
