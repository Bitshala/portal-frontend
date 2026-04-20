import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  content: string;
}

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|(?<!\w)_[^_\n]+_(?!\w)|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(
        <Box component="strong" key={key++} sx={{ fontWeight: 700 }}>
          {token.slice(2, -2)}
        </Box>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <Box
          component="code"
          key={key++}
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            bgcolor: 'rgba(0,0,0,0.05)',
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontSize: '0.9em',
          }}
        >
          {token.slice(1, -1)}
        </Box>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        nodes.push(
          <Box
            component="a"
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            sx={{ color: 'primary.main', textDecoration: 'underline' }}
          >
            {linkMatch[1]}
          </Box>,
        );
      }
    } else {
      nodes.push(
        <Box component="em" key={key++} sx={{ fontStyle: 'italic' }}>
          {token.slice(1, -1)}
        </Box>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

const renderMarkdown = (md: string): ReactNode[] => {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const sizes = ['1.9rem', '1.5rem', '1.25rem', '1.1rem', '1rem', '0.95rem'];
      const margins = [
        { mt: 0, mb: 2.5 },
        { mt: 4, mb: 2 },
        { mt: 3, mb: 1.5 },
        { mt: 2.5, mb: 1.25 },
        { mt: 2, mb: 1 },
        { mt: 2, mb: 1 },
      ];
      out.push(
        <Typography
          key={key++}
          component={`h${level}` as 'h1'}
          sx={{
            fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
            fontWeight: level <= 2 ? 700 : 600,
            fontSize: sizes[level - 1],
            lineHeight: 1.25,
            color: 'text.primary',
            borderBottom: level === 1 ? '1px solid' : 'none',
            borderColor: 'divider',
            pb: level === 1 ? 1.5 : 0,
            ...margins[level - 1],
          }}
        >
          {renderInline(heading[2])}
        </Typography>,
      );
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(
        <Box
          component="ul"
          key={key++}
          sx={{ pl: 3.5, my: 1.5, '& li': { mb: 0.75 } }}
        >
          {items.map((it, idx) => (
            <Box
              component="li"
              key={idx}
              sx={{
                fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
                fontSize: '1.02rem',
                lineHeight: 1.75,
                color: 'text.primary',
              }}
            >
              {renderInline(it)}
            </Box>
          ))}
        </Box>,
      );
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(
        <Box
          key={key++}
          sx={{
            borderLeft: '3px solid',
            borderColor: 'divider',
            pl: 2,
            my: 2,
            color: 'text.secondary',
            fontStyle: 'italic',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
              fontSize: '1.02rem',
              lineHeight: 1.75,
            }}
          >
            {renderInline(buf.join(' '))}
          </Typography>
        </Box>,
      );
      continue;
    }

    const paraBuf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i])
    ) {
      paraBuf.push(lines[i]);
      i++;
    }
    out.push(
      <Typography
        key={key++}
        component="p"
        sx={{
          fontFamily: '"Source Serif 4", "Source Serif Pro", Georgia, serif',
          fontSize: '1.05rem',
          lineHeight: 1.75,
          color: 'text.primary',
          my: 1.5,
        }}
      >
        {renderInline(paraBuf.join(' '))}
      </Typography>,
    );
  }

  return out;
};

export const MarkdownView = ({ content }: Props) => (
  <Box
    sx={{
      bgcolor: '#fdfdfb',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      p: { xs: 3, md: 6 },
      maxWidth: 780,
      mx: 'auto',
      '& p:first-of-type': { mt: 0 },
    }}
  >
    {renderMarkdown(content)}
  </Box>
);

export default MarkdownView;
