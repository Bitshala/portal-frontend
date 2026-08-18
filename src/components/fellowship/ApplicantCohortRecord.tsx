import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CohortPerformanceChart } from '../student/CohortPerformanceChart';
import { useUserScores } from '../../hooks/scoreHooks';

interface ApplicantCohortRecordProps {
  applicantId: string;
  applicantName?: string | null;
}

/**
 * Compact cohort performance panel for fellowship review.
 * Reuses the same /scores/user/:id payload as the student detail page.
 */
export const ApplicantCohortRecord = ({
  applicantId,
  applicantName,
}: ApplicantCohortRecordProps) => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useUserScores(applicantId, {
    enabled: !!applicantId,
  });

  const cohorts = data?.cohorts ?? [];
  const primaryCohortId = cohorts[0]?.cohortId;

  if (isLoading) {
    return (
      <Box sx={{ mt: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Loading cohort record…
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          Couldn’t load this applicant’s cohort scores.
        </Typography>
      </Box>
    );
  }

  if (cohorts.length === 0) {
    return (
      <Box
        sx={{
          mt: 3,
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.75,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Cohort record
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {applicantName ? `${applicantName} has` : 'This applicant has'} no cohort scores on file yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Cohort record
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Performance across all Bitshala cohorts
          </Typography>
        </Box>
        {primaryCohortId && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(`/student/${applicantId}/${primaryCohortId}`)}
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            Open student page
          </Button>
        )}
      </Stack>

      <CohortPerformanceChart
        cohorts={cohorts}
        onSelectCohort={(cohortId) => navigate(`/student/${applicantId}/${cohortId}`)}
      />
    </Box>
  );
};

export default ApplicantCohortRecord;
