import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import FellowshipLayout from '../../components/fellowship/FellowshipLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import { useMyFellowships } from '../../hooks/fellowshipHooks';

const MyFellowships = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMyFellowships({ page: 0, pageSize: 20 });
  const records = data?.records ?? [];

  useEffect(() => {
    if (!isLoading && records.length === 1) {
      navigate(`/fellowship/fellowships/${records[0].id}`, { replace: true });
    }
  }, [isLoading, records, navigate]);

  return (
    <FellowshipLayout title="My fellowships">
      {isLoading && <CircularProgress size={22} />}
      {!isLoading && records.length === 0 && (
        <Card variant="outlined" sx={{ borderColor: 'divider' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              No fellowship yet
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Once your application is accepted, your fellowship will appear here.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/fellowship/apply')}>
              Apply now
            </Button>
          </CardContent>
        </Card>
      )}
      <Grid container spacing={2}>
        {records.map((f) => (
          <Grid size={{ xs: 12, md: 6 }} key={f.id}>
            <Card
              variant="outlined"
              sx={{
                borderColor: 'divider',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.light' },
              }}
              onClick={() => navigate(`/fellowship/fellowships/${f.id}`)}
            >
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {f.type}
                  </Typography>
                  <StatusChip status={f.status} />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {f.projectName || 'Awaiting onboarding'}
                </Typography>
                {f.startDate && f.endDate && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                    {new Date(f.startDate).toLocaleDateString()} — {new Date(f.endDate).toLocaleDateString()}
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button size="small" variant="outlined">
                    Open dashboard
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </FellowshipLayout>
  );
};

export default MyFellowships;
