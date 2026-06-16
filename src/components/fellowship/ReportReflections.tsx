import { Box, Stack, Typography } from '@mui/material';
import MarkdownView from './MarkdownView';
import type { GetFellowshipReportContentResponseDto } from '../../types/fellowship';
import { REFLECTIVE_QUESTIONS } from '../../utils/reportContent';

// Read-only render of the four reflective answers, shared by the editor's
// read view, the admin reviewer drawer, and the fellow's view dialog. Only
// answered questions are shown; renders nothing when all four are blank.
const ReportReflections = ({
  content,
}: {
  content: GetFellowshipReportContentResponseDto;
}) => {
  const answered = REFLECTIVE_QUESTIONS.filter((q) => content[q.field]?.trim());
  if (answered.length === 0) return null;

  return (
    <Stack spacing={2.5} sx={{ mt: 3 }}>
      {answered.map((q) => (
        <Box key={q.field}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            {q.prompt}
          </Typography>
          <MarkdownView content={content[q.field]} />
        </Box>
      ))}
    </Stack>
  );
};

export default ReportReflections;
