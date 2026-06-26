import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { BookOpen, User, Eye, Download, UserPlus, Clock, MessageSquare, CalendarPlus } from 'lucide-react';
import { useMyCohorts, useCohorts, useJoinCohort, useJoinCohortWaitlist } from '../../hooks/cohortHooks';
import apiService from '../../services/apiService';
import { useUser } from '../../hooks/userHooks';
import { useMyCertificates, useDownloadCertificate } from '../../hooks/certificateHooks';
import { CohortType } from '../../types/enums';
import Tabs from '../../components/ui/Tabs';
import CohortTable from '../../components/ui/CohortTable';
import type { CohortRow } from '../../components/ui/CohortTable';
import {
  formatCohortType,
  getJoinableActiveCohorts,
  groupCohortsByStatus,
  isRegistrationOpen,
  toCohortRow,
  toCohortStatusTabs,
} from '../../utils/cohortUtils';
import { isProfileComplete } from '../../utils/userUtils';
import { extractErrorMessage } from '../../utils/errorUtils';
import type { NotificationState } from '../../types/feedback';

type DashboardCohortRow = CohortRow & {
  enrolled: boolean;
  registrationOpen?: boolean;
  cohortType?: CohortType;
};

const MyStudentDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
  const { data: allCohortsData } = useCohorts({ page: 0, pageSize: 100 });
  const { mutate: joinCohort } = useJoinCohort();
  const { mutate: joinWaitlist } = useJoinCohortWaitlist();
  const { data: userData } = useUser();
  const { data: myCertificates } = useMyCertificates();
  const { mutate: downloadCertificate, isPending: isDownloading } = useDownloadCertificate();

  const [activeTab, setActiveTab] = useState<string>('Active');
  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [loadingCohortId, setLoadingCohortId] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: '',
    type: 'success',
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    show: boolean;
    cohortId: string;
    cohortName: string;
    isWaitlist: boolean;
    cohortType?: CohortType;
  }>({
    show: false,
    cohortId: '',
    cohortName: '',
    isWaitlist: false,
  });

  const myCohorts = useMemo(() => data?.records ?? [], [data]);

  const availableCohorts = useMemo(
    () => getJoinableActiveCohorts(allCohortsData?.records ?? [], myCohorts),
    [allCohortsData, myCohorts],
  );

  const allRows: DashboardCohortRow[] = useMemo(() => {
    const enrolledRows: DashboardCohortRow[] = myCohorts.map((cohort) => ({
      ...toCohortRow(cohort),
      enrolled: true,
    }));

    const availableRows: DashboardCohortRow[] = availableCohorts.map((cohort) => ({
      ...toCohortRow(cohort),
      enrolled: false,
      registrationOpen: isRegistrationOpen(cohort.registrationDeadline),
      cohortType: cohort.type as CohortType,
    }));

    return [...enrolledRows, ...availableRows];
  }, [myCohorts, availableCohorts]);

  const grouped = useMemo(() => groupCohortsByStatus(allRows), [allRows]);

  const tabs = useMemo(() => toCohortStatusTabs(grouped), [grouped]);

  const filteredCohorts = grouped[activeTab as keyof typeof grouped] ?? [];

  const emptyCohortsMessage = (() => {
    const isUpcoming = activeTab === 'Upcoming';
    const title = isUpcoming ? 'No upcoming cohorts yet' : `No ${activeTab.toLowerCase()} cohorts found`;
    const description = isUpcoming
      ? 'There are no future cohorts scheduled at the moment. You can still explore active cohorts and join or waitlist where available.'
      : `When you have ${activeTab.toLowerCase()} cohorts, they will appear here.`;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: 460 }}>
        <Box
          sx={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(20,184,166,0.1)',
            border: '1px solid rgba(20,184,166,0.25)',
            mb: 2,
          }}
        >
          {isUpcoming ? <Clock size={26} color="#5eead4" /> : <BookOpen size={26} color="#5eead4" />}
        </Box>
        <Typography variant="h6" sx={{ color: '#fafafa', fontWeight: 700, mb: 0.75 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#a1a1aa', lineHeight: 1.7 }}>
          {description}
        </Typography>
        {isUpcoming && grouped.Active.length > 0 && (
          <Button
            size="small"
            onClick={() => setActiveTab('Active')}
            sx={{
              mt: 2.5,
              color: '#5eead4',
              borderColor: 'rgba(20,184,166,0.35)',
              bgcolor: 'rgba(20,184,166,0.08)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(20,184,166,0.16)', borderColor: 'rgba(20,184,166,0.5)' },
            }}
            variant="outlined"
          >
            Browse active cohorts
          </Button>
        )}
      </Box>
    );
  })();

  const handleJoinCohort = (cohortId: string, cohortName: string) => {
    if (!isProfileComplete(userData)) {
      navigate('/me', { state: { showEmailPopup: true } });
      return;
    }
    setConfirmationModal({ show: true, cohortId, cohortName, isWaitlist: false });
  };

  const handleJoinWaitlist = (cohortId: string, cohortType: CohortType) => {
    if (!isProfileComplete(userData)) {
      navigate('/me', { state: { showEmailPopup: true } });
      return;
    }
    setConfirmationModal({
      show: true,
      cohortId,
      cohortName: formatCohortType(cohortType),
      isWaitlist: true,
      cohortType,
    });
  };

  const confirmJoinCohort = () => {
    const { cohortId, cohortName, isWaitlist, cohortType } = confirmationModal;
    setConfirmationModal({ show: false, cohortId: '', cohortName: '', isWaitlist: false });
    setLoadingCohortId(cohortId);

    if (isWaitlist && cohortType) {
      joinWaitlist(
        { type: cohortType },
        {
          onSuccess: () => {
            setLoadingCohortId(null);
            setNotification({
              show: true,
              message: `Successfully joined the waitlist for ${cohortName}!`,
              type: 'success',
            });
          },
          onError: (error) => {
            setLoadingCohortId(null);
            setNotification({
              show: true,
              message: `Failed to join waitlist: ${extractErrorMessage(error)}`,
              type: 'error',
            });
          },
        },
      );
    } else {
      joinCohort(
        { cohortId },
        {
          onSuccess: () => {
            setLoadingCohortId(null);
            setNotification({
              show: true,
              message: `Successfully joined ${cohortName} cohort!`,
              type: 'success',
            });
          },
          onError: (error: unknown) => {
            setLoadingCohortId(null);
            setNotification({
              show: true,
              message: extractErrorMessage(error),
              type: 'error',
            });
          },
        },
      );
    }
  };

  const cancelJoinCohort = () => {
    setConfirmationModal({ show: false, cohortId: '', cohortName: '', isWaitlist: false });
  };

  const closeNotification = () => {
    setNotification({ show: false, message: '', type: 'success' });
  };

  const handleDownloadCertificate = (certificateId: string, certificateName: string) => {
    setDownloadingCertId(certificateId);
    downloadCertificate(
      { id: certificateId },
      {
        onSuccess: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${certificateName}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          setDownloadingCertId(null);
        },
        onError: (error) => {
          setDownloadingCertId(null);
          setNotification({
            show: true,
            message: `Failed to download certificate: ${extractErrorMessage(error)}`,
            type: 'error',
          });
        },
      },
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa', px: { xs: 2, md: 5, lg: 8 }, py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 3, bgcolor: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.25)' }}>
            <BookOpen size={24} color="#2dd4bf" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '1.875rem' } }}>
                My Dashboard
              </Typography>
              <Chip
                label="Student"
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  bgcolor: 'rgba(20,184,166,0.15)',
                  color: '#2dd4bf',
                  border: '1px solid rgba(20,184,166,0.25)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#a1a1aa', mt: 0.5 }}>
              View and manage your cohorts.
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<User size={16} />}
          onClick={() => navigate('/me')}
          sx={{
            color: '#5eead4',
            borderColor: 'rgba(20,184,166,0.25)',
            bgcolor: 'rgba(20,184,166,0.1)',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            px: 2.5,
            '&:hover': { bgcolor: 'rgba(20,184,166,0.2)', borderColor: 'rgba(20,184,166,0.4)' },
          }}
        >
          Profile
        </Button>
      </Box>

      {/* Tabs + Table */}
      <Paper sx={{ bgcolor: 'rgba(39,39,42,0.5)', borderRadius: 3, border: '1px solid rgba(20,184,166,0.2)', overflow: 'hidden' }}>
        <Box sx={{ px: 2, pt: 1.5 }}>
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} accent="#14b8a6" />
        </Box>

        <CohortTable
          cohorts={filteredCohorts}
          loading={isLoading}
          emptyMessage={emptyCohortsMessage}
          onRowClick={(cohort) => {
            const row = cohort as DashboardCohortRow;
            if (row.enrolled && userData?.id) {
              navigate(`/student/${userData.id}/${row.id}`);
              return;
            }

            if (!row.enrolled) {
              if (row.registrationOpen) {
                handleJoinCohort(row.id, formatCohortType(row.type));
              } else if (row.cohortType) {
                handleJoinWaitlist(row.id, row.cohortType);
              }
            }
          }}
          actions={(cohort) => {
            const row = cohort as DashboardCohortRow;
            const isJoining = loadingCohortId === row.id;

            if (row.enrolled) {
              const certificate = myCertificates?.find((c) => c.cohortId === row.id);
              return (
                <>
                  <Tooltip title="View cohort details" arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (userData?.id) {
                          navigate(`/student/${userData.id}/${row.id}`);
                        }
                      }}
                      sx={{
                        color: '#fb923c',
                        bgcolor: 'rgba(249,115,22,0.1)',
                        '&:hover': { bgcolor: 'rgba(249,115,22,0.2)' },
                      }}
                    >
                      <Eye size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Submit feedback for this cohort" arrow>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/cohortfeedback?cohortId=${row.id}`)}
                      sx={{
                        color: '#a78bfa',
                        bgcolor: 'rgba(167,139,250,0.1)',
                        '&:hover': { bgcolor: 'rgba(167,139,250,0.2)' },
                      }}
                    >
                      <MessageSquare size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Subscribe to cohort calendar" arrow>
                    <IconButton
                      size="small"
                      onClick={() => {
                        window.location.href = apiService.getCalendarSubscribeUrl(row.id);
                      }}
                      sx={{
                        color: '#34d399',
                        bgcolor: 'rgba(52,211,153,0.1)',
                        '&:hover': { bgcolor: 'rgba(52,211,153,0.2)' },
                      }}
                    >
                      <CalendarPlus size={16} />
                    </IconButton>
                  </Tooltip>
                  {row.status === 'Completed' && certificate && (
                    <Button
                      size="small"
                      startIcon={
                        isDownloading && downloadingCertId === certificate.id
                          ? <CircularProgress size={14} sx={{ color: '#2dd4bf' }} />
                          : <Download size={14} />
                      }
                      disabled={isDownloading && downloadingCertId === certificate.id}
                      onClick={() => handleDownloadCertificate(certificate.id, `${row.name}-S${row.season}-certificate`)}
                      sx={{
                        color: '#2dd4bf',
                        bgcolor: 'rgba(20,184,166,0.1)',
                        textTransform: 'none',
                        fontWeight: 500,
                        fontSize: '0.75rem',
                        px: 1.5,
                        minWidth: 'auto',
                        '&:hover': { bgcolor: 'rgba(20,184,166,0.2)' },
                        '&.Mui-disabled': { color: '#2dd4bf', opacity: 0.5 },
                      }}
                    >
                      Certificate
                    </Button>
                  )}
                </>
              );
            }

            if (row.registrationOpen) {
              return (
                <Button
                  size="small"
                  startIcon={
                    isJoining
                      ? <CircularProgress size={14} sx={{ color: '#4ade80' }} />
                      : <UserPlus size={14} />
                  }
                  disabled={isJoining}
                  onClick={() => handleJoinCohort(row.id, formatCohortType(row.type))}
                  sx={{
                    color: '#4ade80',
                    bgcolor: 'rgba(34,197,94,0.1)',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    px: 1.5,
                    minWidth: 'auto',
                    '&:hover': { bgcolor: 'rgba(34,197,94,0.2)' },
                    '&.Mui-disabled': { color: '#4ade80', opacity: 0.5 },
                  }}
                >
                  Join
                </Button>
              );
            }

            return (
              <Button
                size="small"
                startIcon={
                  isJoining
                    ? <CircularProgress size={14} sx={{ color: '#60a5fa' }} />
                    : <Clock size={14} />
                }
                disabled={isJoining}
                onClick={() => row.cohortType && handleJoinWaitlist(row.id, row.cohortType)}
                sx={{
                  color: '#60a5fa',
                  bgcolor: 'rgba(59,130,246,0.1)',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  px: 1.5,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: 'rgba(59,130,246,0.2)' },
                  '&.Mui-disabled': { color: '#60a5fa', opacity: 0.5 },
                }}
              >
                Waitlist
              </Button>
            );
          }}
        />
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationModal.show}
        onClose={cancelJoinCohort}
        PaperProps={{
          sx: { bgcolor: '#27272a', borderRadius: 3, border: '1px solid #3f3f46', maxWidth: 440 },
        }}
      >
        <DialogTitle sx={{ color: '#fafafa', fontWeight: 700, fontSize: '1.125rem', pb: 1 }}>
          {confirmationModal.isWaitlist ? 'Join Waitlist' : 'Join Cohort'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
            {confirmationModal.isWaitlist
              ? `You are not a part of this cohort. Please join the ${confirmationModal.cohortName} cohort waitlist.`
              : `You are not a part of this cohort. Please join the ${confirmationModal.cohortName} cohort.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={cancelJoinCohort}
            sx={{ color: '#d4d4d8', bgcolor: '#3f3f46', textTransform: 'none', '&:hover': { bgcolor: '#52525b' } }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmJoinCohort}
            variant="contained"
            sx={{ bgcolor: '#ea580c', textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { bgcolor: '#c2410c' } }}
          >
            {confirmationModal.isWaitlist ? 'Join Waitlist' : 'Join Cohort'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.show}
        autoHideDuration={5000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeNotification}
          severity={notification.type === 'success' ? 'success' : 'error'}
          variant="filled"
          sx={{ width: '100%', fontWeight: 500 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MyStudentDashboard;
