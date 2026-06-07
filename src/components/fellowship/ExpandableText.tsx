import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';

/**
 * Long-form text clamped to a few lines with a "Show more" toggle —
 * keeps proposal read views scannable without hiding anything.
 */
export const ExpandableText = ({
  text,
  maxLines = 6,
}: {
  text: string;
  maxLines?: number;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    // Only measure while clamped — expanded text never overflows.
    if (expanded) return;
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, [text, expanded, maxLines]);

  return (
    <Box>
      <Typography
        ref={ref}
        variant="body2"
        sx={{
          color: 'text.primary',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          ...(expanded
            ? {}
            : {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }),
        }}
      >
        {text}
      </Typography>
      {(overflowing || expanded) && (
        <Button
          size="small"
          variant="text"
          onClick={() => setExpanded((e) => !e)}
          sx={{ mt: 0.5, px: 0.5, minWidth: 0, fontSize: '0.78rem' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </Box>
  );
};

export default ExpandableText;
