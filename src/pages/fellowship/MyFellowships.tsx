import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import MarkdownView from '../../components/fellowship/MarkdownView';
import {
  useApplication,
  useApplicationProposal,
  useMyApplications,
  useMyFellowships,
} from '../../hooks/fellowshipHooks';
import { FellowshipApplicationStatus } from '../../types/fellowship';

const ApplicationDetailView = ({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const appQuery = useApplication(id);
  const proposalQuery = useApplicationProposal(id);
  const app = appQuery.data;

  return (
    <Box>
      <Button
        onClick={onClose}
        sx={{
          mb: 3,
          pl: 0,
          color: 'text.secondary',
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
        }}
      >
        ← Back to my fellowships
      </Button>

      {appQuery.isLoading || !app ? (
        <CircularProgress size={22} />
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {app.type} application
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Updated {new Date(app.updatedAt).toLocaleDateString()}
                {app.submittedAt && (
                  <> · submitted {new Date(app.submittedAt).toLocaleDateString()}</>
                )}
              </Typography>
            </Box>
            <StatusChip status={app.status} />
          </Stack>

          {app.status === FellowshipApplicationStatus.REJECTED && app.reviewerRemarks && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <strong>Reviewer remarks:</strong> {app.reviewerRemarks}
            </Alert>
          )}

          {app.status === FellowshipApplicationStatus.ACCEPTED && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Application accepted. A fellowship entry has been created for you.
            </Alert>
          )}

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
            Proposal
          </Typography>
          {proposalQuery.isLoading && <CircularProgress size={18} />}
          {proposalQuery.data && <MarkdownView content={proposalQuery.data.proposal} />}

          {app.status === FellowshipApplicationStatus.DRAFT && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => navigate(`/fellowship/apply?appId=${app.id}`)}
              >
                Edit draft
              </Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

const MyFellowships = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMyFellowships({ page: 0, pageSize: 20 });
  const records = data?.records ?? [];
  const applicationsQuery = useMyApplications({ page: 0, pageSize: 20 });
  const applications = applicationsQuery.data?.records ?? [];

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && records.length === 1 && !selectedAppId) {
      navigate(`/fellowship/fellowships/${records[0].id}`, { replace: true });
    }
  }, [isLoading, records, navigate, selectedAppId]);

  if (selectedAppId) {
    return (
      <FellowshipPageLayout>
        <ApplicationDetailView
          id={selectedAppId}
          onClose={() => setSelectedAppId(null)}
        />
      </FellowshipPageLayout>
    );
  }

  return (
    <FellowshipPageLayout title="My fellowships" subtitle="Track your fellowships, applications, and reports.">
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
                onClick={() => setSelectedAppId(app.id)}
                sx={{
                  p: 1.25,
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
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
    </FellowshipPageLayout>
  );
};

export default MyFellowships;
