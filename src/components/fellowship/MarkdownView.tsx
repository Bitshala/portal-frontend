import { Box } from '@mui/material';

interface Props {
  content: string;
}

export const MarkdownView = ({ content }: Props) => (
  <Box
    component="pre"
    sx={{
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      fontFamily: 'Sora, sans-serif',
      fontSize: '0.95rem',
      lineHeight: 1.6,
      color: 'text.primary',
      bgcolor: '#fafafa',
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1.5,
      p: 2,
      m: 0,
      maxHeight: 480,
      overflow: 'auto',
    }}
  >
    {content}
  </Box>
);

export default MarkdownView;
