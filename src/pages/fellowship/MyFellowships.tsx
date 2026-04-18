import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import FellowshipLayout from '../../components/fellowship/FellowshipLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import { useMyApplications, useMyFellowships } from '../../hooks/fellowshipHooks';

const MyFellowships = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMyFellowships({ page: 0, pageSize: 20 });
  const records = data?.records ?? [];
  const applicationsQuery = useMyApplications({ page: 0, pageSize: 20 });
  const applications = applicationsQuery.data?.records ?? [];

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

      <Card variant="outlined" sx={{ borderColor: 'divider', mt: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            My applications
          </Typography>
          {applicationsQuery.isLoading && <CircularProgress size={20} />}
          {!applicationsQuery.isLoading && applications.length === 0 && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              You haven't applied yet.
            </Typography>
          )}
          <Stack spacing={1} divider={<Divider flexItem />}>
            {applications.map((app) => (
              <Box
                key={app.id}
                onClick={() => navigate(`/fellowship/apply?appId=${app.id}`)}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {app.type}
                  </Typography>
                  <StatusChip status={app.status} />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Updated {new Date(app.updatedAt).toLocaleDateString()}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </FellowshipLayout>
  );
};

export default MyFellowships;
