import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Check, Eye, FileText, MessageSquare, RefreshCw } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import MarkdownView from '../../components/fellowship/MarkdownView';
import {
  useApplication,
  useApplicationProposal,
  useMyApplications,
  useMyFellowships,
  useMyReports,
  useSubmitApplication,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  FellowshipReportStatus,
  FellowshipStatus,
  type GetFellowshipApplicationResponseDto,
  type GetFellowshipReportResponseDto,
  type GetFellowshipResponseDto,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

type MonthSlot = { month: number; year: number; index: number };

const monthRange = (startDate: string, endDate: string): MonthSlot[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const out: MonthSlot[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  // If the fellowship starts in the second half of the month, that month is too
  // short to report on — the first report period is the next full month.
  if (start.getDate() > 15) cursor.setMonth(cursor.getMonth() + 1);
  const stop = new Date(end.getFullYear(), end.getMonth(), 1);
  let i = 0;
  while (cursor <= stop) {
    out.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear(), index: i++ });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
};

const shortMonth = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });

const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatDateShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const cycleLabel = (startDate: string) => {
  const d = new Date(startDate);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Cycle Q${q} ${d.getFullYear()}`;
};

const dueDateFor = (month: number, year: number): Date => {
  // report due on the last day of the calendar month
  return new Date(year, month, 0);
};

const daysBetween = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

const MyFellowships = () => {
  const navigate = useNavigate();
  const fellowshipsQuery = useMyFellowships({ page: 0, pageSize: 20 });
  const applicationsQuery = useMyApplications({ page: 0, pageSize: 20 });
  const reportsQuery = useMyReports({ page: 0, pageSize: 100 });
  const submitMut = useSubmitApplication();

  const applications = useMemo(
    () => applicationsQuery.data?.records ?? [],
    [applicationsQuery.data?.records],
  );
  const reports = reportsQuery.data?.records ?? [];

  const changesRequestedApp = useMemo<GetFellowshipApplicationResponseDto | null>(
    () =>
      applications.find(
        (a) => a.status === FellowshipApplicationStatus.CHANGES_REQUESTED,
      ) ?? null,
    [applications],
  );

  // Drafts (not yet submitted) and submitted-but-pending applications. These have
  // no fellowship yet, so without this they'd be invisible — leaving the user stuck
  // on "you already have a draft" with nowhere to resume it. CHANGES_REQUESTED has
  // its own banner above, so it's excluded here.
  const inProgressApps = useMemo(
    () =>
      applications.filter(
        (a) =>
          a.status === FellowshipApplicationStatus.DRAFT ||
          a.status === FellowshipApplicationStatus.SUBMITTED,
      ),
    [applications],
  );

  const [resubmitError, setResubmitError] = useState<string | null>(null);

  const handleResubmit = async (id: string) => {
    setResubmitError(null);
    try {
      await submitMut.mutateAsync({ id });
    } catch (e) {
      setResubmitError(extractErrorMessage(e));
    }
  };

  const activeFellowship = useMemo<GetFellowshipResponseDto | null>(() => {
    const fellowships = fellowshipsQuery.data?.records ?? [];
    return (
      fellowships.find((f) => f.status === FellowshipStatus.ACTIVE) ??
      fellowships[0] ??
      null
    );
  }, [fellowshipsQuery.data]);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const isLoading =
    fellowshipsQuery.isLoading || applicationsQuery.isLoading || reportsQuery.isLoading;

  // Before a fellowship is awarded the page is really just the user's applications,
  // so the header doubles as the section title (no redundant inner heading).
  const applicationsOnly = !activeFellowship && inProgressApps.length > 0;
  const pageTitle = applicationsOnly
    ? inProgressApps.length > 1
      ? 'Your fellowship applications'
      : 'Your fellowship application'
    : 'My fellowship';
  const pageSubtitle = applicationsOnly
    ? 'Continue a draft or check the status of a submitted application.'
    : 'Track progress, submit reports, request payouts.';

  if (selectedAppId) {
    return (
      <FellowshipPageLayout hideIcon>
        <ApplicationDetailView id={selectedAppId} onClose={() => setSelectedAppId(null)} />
      </FellowshipPageLayout>
    );
  }

  return (
    <FellowshipPageLayout title={pageTitle} subtitle={pageSubtitle} hideIcon>
      {isLoading && <CircularProgress size={22} />}

      {resubmitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setResubmitError(null)}>
          {resubmitError}
        </Alert>
      )}

      {!isLoading && changesRequestedApp && (
        <ChangesRequestedBanner
          app={changesRequestedApp}
          onEdit={() =>
            navigate(`/fellowship/apply?appId=${changesRequestedApp.id}`)
          }
          onResubmit={() => handleResubmit(changesRequestedApp.id)}
          isResubmitting={submitMut.isPending}
        />
      )}

      {!isLoading && !activeFellowship && inProgressApps.length > 0 && (
        <InProgressApplicationsPanel
          applications={inProgressApps}
          onContinue={(id) => navigate(`/fellowship/apply?appId=${id}`)}
          onView={setSelectedAppId}
        />
      )}

      {!isLoading &&
        !activeFellowship &&
        !changesRequestedApp &&
        inProgressApps.length === 0 && (
          <EmptyState onApply={() => navigate('/fellowship/apply')} />
        )}

      {!isLoading && activeFellowship && (
        <Stack spacing={2.5}>
          <ActiveFellowshipCard
            fellowship={activeFellowship}
            reports={reports.filter((r) => r.fellowshipId === activeFellowship.id)}
            onOpenProposal={() => navigate(`/fellowship/fellowships/${activeFellowship.id}`)}
            onSubmitReport={(month, year) =>
              navigate(
                `/fellowship/fellowships/${activeFellowship.id}/reports/new?month=${month}&year=${year}`,
              )
            }
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.4fr) minmax(0, 1fr)' },
              gap: 2.5,
            }}
          >
            <MonthlyReportsPanel
              fellowship={activeFellowship}
              reports={reports.filter((r) => r.fellowshipId === activeFellowship.id)}
              onOpenReport={(reportId) =>
                navigate(`/fellowship/fellowships/${activeFellowship.id}/reports/${reportId}`)
              }
              onNewReport={(month, year) =>
                navigate(
                  `/fellowship/fellowships/${activeFellowship.id}/reports/new?month=${month}&year=${year}`,
                )
              }
            />
            <PastApplicationsPanel
              applications={applications}
              onOpen={setSelectedAppId}
            />
          </Box>
        </Stack>
      )}
    </FellowshipPageLayout>
  );
};

// ---- Changes requested banner ----

const ChangesRequestedBanner = ({
  app,
  onEdit,
  onResubmit,
  isResubmitting,
}: {
  app: GetFellowshipApplicationResponseDto;
  onEdit: () => void;
  onResubmit: () => void;
  isResubmitting: boolean;
}) => (
  <Box
    sx={{
      border: '1px solid rgba(251,146,60,0.4)',
      borderRadius: 0.75,
      bgcolor: 'rgba(251,146,60,0.06)',
      p: { xs: 2, md: 2.5 },
      mb: 2.5,
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      alignItems: { xs: 'stretch', md: 'flex-start' },
      gap: 2,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, flex: 1, minWidth: 0 }}>
      <Box sx={{ color: '#fb923c', mt: '2px' }}>
        <MessageSquare size={18} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, color: '#fb923c', mb: 0.5 }}>
          Changes requested on your {app.type.toLowerCase()} application
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}
        >
          {app.reviewerRemarks ?? 'The reviewer has asked for revisions before this can be accepted.'}
        </Typography>
        {app.reviewedByName && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
            — {app.reviewedByName}
          </Typography>
        )}
      </Box>
    </Box>
    <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} sx={{ flexShrink: 0 }}>
      <Button variant="contained" onClick={onEdit} sx={{ whiteSpace: 'nowrap' }}>
        Edit proposal
      </Button>
      <Button
        variant="outlined"
        onClick={onResubmit}
        disabled={isResubmitting}
        startIcon={<RefreshCw size={14} />}
        sx={{ whiteSpace: 'nowrap', color: 'text.primary', borderColor: 'divider' }}
      >
        {isResubmitting ? 'Resubmitting…' : 'Resubmit as-is'}
      </Button>
    </Stack>
  </Box>
);

// ---- Empty state ----

const EmptyState = ({ onApply }: { onApply: () => void }) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0.75,
      bgcolor: 'background.paper',
      p: { xs: 3, md: 5 },
      textAlign: 'center',
    }}
  >
    <Typography variant="h6" sx={{ mb: 1 }}>
      No fellowship yet
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
      Once your application is accepted, your fellowship will appear here.
    </Typography>
    <Button variant="contained" onClick={onApply}>
      Apply now
    </Button>
  </Box>
);

// ---- Active fellowship hero ----

const ActiveFellowshipCard = ({
  fellowship,
  reports,
  onOpenProposal,
  onSubmitReport,
}: {
  fellowship: GetFellowshipResponseDto;
  reports: GetFellowshipReportResponseDto[];
  onOpenProposal: () => void;
  onSubmitReport: (month: number, year: number) => void;
}) => {
  const isActive = fellowship.status === FellowshipStatus.ACTIVE;
  const hasContract = !!fellowship.startDate && !!fellowship.endDate;

  const months = useMemo<MonthSlot[]>(
    () =>
      hasContract ? monthRange(fellowship.startDate!, fellowship.endDate!) : [],
    [fellowship.startDate, fellowship.endDate, hasContract],
  );

  const reportByMonth = useMemo(() => {
    const map = new Map<string, GetFellowshipReportResponseDto>();
    for (const r of reports) map.set(`${r.year}-${r.month}`, r);
    return map;
  }, [reports]);

  const now = useMemo(() => new Date(), []);
  const currentMonthIdx = useMemo(() => {
    if (months.length === 0) return -1;
    const ym = now.getFullYear() * 12 + now.getMonth();
    return months.findIndex((m) => (m.year * 12 + (m.month - 1)) === ym);
  }, [months, now]);

  const completedMonths = months.filter((m) => {
    const r = reportByMonth.get(`${m.year}-${m.month}`);
    return (
      r?.status === FellowshipReportStatus.APPROVED ||
      r?.status === FellowshipReportStatus.SUBMITTED
    );
  }).length;

  const progressPct = months.length ? Math.round((completedMonths / months.length) * 100) : 0;

  const monthNumber = (idx: number) => idx + 1;
  const activeIdx = currentMonthIdx >= 0 ? currentMonthIdx : Math.max(0, months.length - 1);
  const activeSlot = months[activeIdx];
  const currentMonthName = activeSlot
    ? new Date(activeSlot.year, activeSlot.month - 1, 1).toLocaleDateString('en-US', {
        month: 'long',
      })
    : '';

  const nextReportSlot = useMemo<MonthSlot | null>(() => {
    for (const m of months) {
      const r = reportByMonth.get(`${m.year}-${m.month}`);
      if (!r || r.status === FellowshipReportStatus.DRAFT) return m;
    }
    return null;
  }, [months, reportByMonth]);

  const nextDueDate = nextReportSlot ? dueDateFor(nextReportSlot.month, nextReportSlot.year) : null;
  const daysToDue = nextDueDate ? daysBetween(nextDueDate, now) : null;

  const submittedCount = reports.filter(
    (r) =>
      r.status === FellowshipReportStatus.APPROVED ||
      r.status === FellowshipReportStatus.SUBMITTED,
  ).length;

  return (
    <Box
      sx={{
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ height: 3, bgcolor: 'primary.main' }} />

      <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'flex-start' }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <StatusChip status={fellowship.status} />
              <Typography
                variant="caption"
                sx={{
                  color: 'primary.light',
                  fontWeight: 700,
                  letterSpacing: 1,
                  fontSize: '0.7rem',
                }}
              >
                {fellowship.type}
              </Typography>
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {fellowship.projectName ||
                `${fellowship.type.charAt(0)}${fellowship.type.slice(1).toLowerCase()} fellowship`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {fellowship.startDate && (
                <>Started {formatDate(new Date(fellowship.startDate))}</>
              )}
              {fellowship.mentorContact && <> · Mentor: {fellowship.mentorContact}</>}
              {fellowship.startDate && <> · {cycleLabel(fellowship.startDate)}</>}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25}>
            <Button
              variant="outlined"
              startIcon={<Eye size={15} />}
              onClick={onOpenProposal}
              sx={{ color: 'text.primary' }}
            >
              Proposal
            </Button>
            {isActive && activeSlot && (
              <Button
                variant="contained"
                startIcon={<FileText size={15} />}
                onClick={() => onSubmitReport(activeSlot.month, activeSlot.year)}
              >
                Submit {currentMonthName} report
              </Button>
            )}
          </Stack>
        </Stack>

        {!hasContract && (
          <Alert severity="info" sx={{ mt: 2.5 }}>
            Your application is accepted. An admin will start your contract soon.
          </Alert>
        )}

        {hasContract && months.length > 0 && (
          <>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 3, mb: 1 }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Month {Math.min(activeIdx + 1, months.length)} of {months.length}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 600 }}
              >
                {progressPct}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{
                height: 6,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.06)',
                '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
              }}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 2,
                px: 0.5,
              }}
            >
              {months.map((m) => {
                const r = reportByMonth.get(`${m.year}-${m.month}`);
                const done =
                  r?.status === FellowshipReportStatus.APPROVED ||
                  r?.status === FellowshipReportStatus.SUBMITTED;
                const isCurrent = m.index === currentMonthIdx;
                return (
                  <Stack
                    key={m.index}
                    alignItems="center"
                    spacing={0.5}
                    sx={{ minWidth: 32 }}
                  >
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: done
                          ? 'success.main'
                          : isCurrent
                            ? 'primary.main'
                            : 'transparent',
                        border: '1.5px solid',
                        borderColor: done
                          ? 'success.main'
                          : isCurrent
                            ? 'primary.main'
                            : 'divider',
                        color: done || isCurrent ? '#0a0a0a' : 'text.secondary',
                      }}
                    >
                      {done && <Check size={12} strokeWidth={3} />}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        color: isCurrent ? 'text.primary' : 'text.secondary',
                        fontWeight: 600,
                        letterSpacing: 0.4,
                      }}
                    >
                      M{monthNumber(m.index)}
                    </Typography>
                  </Stack>
                );
              })}
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                gap: 2,
                mt: 3,
                pt: 2.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stat
                label="Reports submitted"
                value={`${submittedCount} / ${months.length}`}
                sub={
                  submittedCount >= activeIdx
                    ? 'On schedule'
                    : `${activeIdx - submittedCount} behind`
                }
              />
              <Stat
                label="Months remaining"
                value={`${Math.max(0, months.length - activeIdx - 1)}`}
                sub={`${activeIdx + 1} of ${months.length} elapsed`}
              />
              <Stat
                label="Payout this month"
                value={
                  fellowship.amountUsd ? `$${fellowship.amountUsd}` : '—'
                }
                sub={fellowship.amountUsd ? 'per month' : 'not set'}
              />
              <Stat
                label="Next report due"
                value={nextDueDate ? formatDateShort(nextDueDate) : '—'}
                sub={
                  nextDueDate && daysToDue !== null
                    ? daysToDue > 0
                      ? `in ${daysToDue} day${daysToDue === 1 ? '' : 's'}`
                      : daysToDue === 0
                        ? 'due today'
                        : `${Math.abs(daysToDue)} day${Math.abs(daysToDue) === 1 ? '' : 's'} overdue`
                    : 'all reports filed'
                }
              />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

const Stat = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <Box>
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        letterSpacing: 1.1,
        fontWeight: 600,
        fontSize: '0.68rem',
        textTransform: 'uppercase',
        display: 'block',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {sub}
    </Typography>
  </Box>
);

// ---- Monthly reports panel ----

const reportStatusFor = (
  slot: MonthSlot,
  report: GetFellowshipReportResponseDto | undefined,
  now: Date,
): FellowshipReportStatus | 'DUE' | 'UPCOMING' | 'OVERDUE' => {
  if (report) return report.status;
  const due = dueDateFor(slot.month, slot.year);
  const slotStart = new Date(slot.year, slot.month - 1, 1);
  if (now < slotStart) return 'UPCOMING';
  // Unfiled past its due date is overdue — not "rejected" (that's a reviewer action).
  return now > due ? 'OVERDUE' : 'DUE';
};

const reportStatusChip = (status: FellowshipReportStatus | 'DUE' | 'UPCOMING' | 'OVERDUE') => {
  if (status === 'DUE')
    return { label: 'Due', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' };
  if (status === 'OVERDUE')
    return { label: 'Overdue', color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
  if (status === 'UPCOMING')
    return { label: 'Upcoming', color: '#a1a1aa', bg: 'rgba(161,161,170,0.10)' };
  const map: Record<string, { color: string; bg: string }> = {
    APPROVED: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    SUBMITTED: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
    REJECTED: { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
    DRAFT: { color: '#d4d4d8', bg: 'rgba(161,161,170,0.12)' },
  };
  const p = map[status] ?? map.DRAFT;
  return { label: status.charAt(0) + status.slice(1).toLowerCase(), ...p };
};

const MonthlyReportsPanel = ({
  fellowship,
  reports,
  onOpenReport,
  onNewReport,
}: {
  fellowship: GetFellowshipResponseDto;
  reports: GetFellowshipReportResponseDto[];
  onOpenReport: (reportId: string) => void;
  onNewReport: (month: number, year: number) => void;
}) => {
  const hasContract = !!fellowship.startDate && !!fellowship.endDate;
  const months = useMemo<MonthSlot[]>(
    () =>
      hasContract ? monthRange(fellowship.startDate!, fellowship.endDate!) : [],
    [fellowship.startDate, fellowship.endDate, hasContract],
  );

  const reportByMonth = useMemo(() => {
    const map = new Map<string, GetFellowshipReportResponseDto>();
    for (const r of reports) map.set(`${r.year}-${r.month}`, r);
    return map;
  }, [reports]);

  const now = useMemo(() => new Date(), []);
  const isActive = fellowship.status === FellowshipStatus.ACTIVE;

  // Order: most recent first (filed ones), then due, then upcoming
  const ordered = useMemo(() => {
    const filed = months
      .filter((m) => reportByMonth.has(`${m.year}-${m.month}`))
      .sort((a, b) => b.index - a.index);
    const due = months.filter((m) => {
      if (reportByMonth.has(`${m.year}-${m.month}`)) return false;
      const slotStart = new Date(m.year, m.month - 1, 1);
      return now >= slotStart;
    });
    const upcoming = months.filter((m) => {
      if (reportByMonth.has(`${m.year}-${m.month}`)) return false;
      const slotStart = new Date(m.year, m.month - 1, 1);
      return now < slotStart;
    });
    return [...filed, ...due, ...upcoming];
  }, [months, reportByMonth, now]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Monthly reports
        </Typography>
        {isActive && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const target =
                months.find((m) => {
                  const r = reportByMonth.get(`${m.year}-${m.month}`);
                  return !r;
                }) ?? months[months.length - 1];
              if (target) onNewReport(target.month, target.year);
            }}
            sx={{ color: 'text.primary' }}
          >
            + New report
          </Button>
        )}
      </Stack>

      {months.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Reports become available once your contract is active.
        </Typography>
      )}

      <Stack spacing={1}>
        {ordered.map((slot) => {
          const report = reportByMonth.get(`${slot.year}-${slot.month}`);
          const status = reportStatusFor(slot, report, now);
          const chip = reportStatusChip(status);
          const subDate = report
            ? formatDateShort(new Date(report.updatedAt))
            : formatDateShort(dueDateFor(slot.month, slot.year));
          const writable = isActive && (status === 'DUE' || status === 'OVERDUE');
          const clickable = !!report || writable;
          return (
            <Box
              key={`${slot.year}-${slot.month}`}
              onClick={() => {
                if (report) onOpenReport(report.id);
                else if (writable) onNewReport(slot.month, slot.year);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.75,
                py: 1.25,
                borderRadius: 0.6,
                bgcolor: 'rgba(255,255,255,0.025)',
                border: '1px solid',
                borderColor: 'divider',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': clickable
                  ? { borderColor: 'primary.light', bgcolor: 'rgba(255,255,255,0.04)' }
                  : {},
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
                  {shortMonth(slot.month)} {slot.year}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.72rem' }}
                >
                  {subDate}
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.4,
                  borderRadius: 4,
                  bgcolor: chip.bg,
                  color: chip.color,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: chip.color,
                  }}
                />
                {chip.label}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

// ---- Past applications panel ----

// ---- In-progress applications (draft / pending) ----

const InProgressApplicationsPanel = ({
  applications,
  onContinue,
  onView,
}: {
  applications: GetFellowshipApplicationResponseDto[];
  onContinue: (id: string) => void;
  onView: (id: string) => void;
}) => (
  <Box
    sx={{
      borderTop: '1px solid',
      borderColor: 'divider',
      mb: 2.5,
    }}
  >
    {applications.map((app) => {
      const isDraft = app.status === FellowshipApplicationStatus.DRAFT;
      return (
        <Box
          key={app.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            py: 1.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            transition: 'background-color 0.12s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {app.type.charAt(0) + app.type.slice(1).toLowerCase()} fellowship
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.72rem' }}
            >
              {isDraft
                ? `Draft · updated ${formatDateShort(new Date(app.updatedAt))}`
                : `Submitted ${formatDateShort(new Date(app.updatedAt))} · under review`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <StatusChip status={app.status} />
            {isDraft ? (
              <Button
                size="small"
                variant="text"
                startIcon={<FileText size={14} />}
                onClick={() => onContinue(app.id)}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Continue draft
              </Button>
            ) : (
              <Button
                size="small"
                variant="text"
                startIcon={<Eye size={14} />}
                onClick={() => onView(app.id)}
                sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}
              >
                View
              </Button>
            )}
          </Stack>
        </Box>
      );
    })}
  </Box>
);

const PastApplicationsPanel = ({
  applications,
  onOpen,
}: {
  applications: ReturnType<typeof useMyApplications>['data'] extends infer T
    ? T extends { records: infer R }
      ? R
      : never
    : never;
  onOpen: (id: string) => void;
}) => {
  const list = (applications ?? []).filter(
    (a) => a.status !== FellowshipApplicationStatus.DRAFT,
  );
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        p: { xs: 2.5, md: 3 },
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
        Past applications
      </Typography>

      {list.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No prior applications.
        </Typography>
      )}

      <Stack spacing={1}>
        {list.map((app) => (
          <Box
            key={app.id}
            onClick={() => onOpen(app.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.75,
              py: 1.25,
              borderRadius: 0.6,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'rgba(255,255,255,0.025)',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease',
              '&:hover': {
                borderColor: 'primary.light',
                bgcolor: 'rgba(255,255,255,0.04)',
              },
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {app.type.charAt(0) + app.type.slice(1).toLowerCase()} fellowship
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontFamily: 'monospace',
                  fontSize: '0.72rem',
                }}
              >
                {cycleLabel(app.createdAt)}
              </Typography>
            </Box>
            <StatusChip status={app.status} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
};

// ---- Application detail drill-in ----

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
  const submitMut = useSubmitApplication();
  const [resubmitError, setResubmitError] = useState<string | null>(null);
  const app = appQuery.data;

  const handleResubmit = async () => {
    setResubmitError(null);
    try {
      await submitMut.mutateAsync({ id });
    } catch (e) {
      setResubmitError(extractErrorMessage(e));
    }
  };

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
        ← Back to my fellowship
      </Button>

      {appQuery.isLoading || !app ? (
        <CircularProgress size={22} />
      ) : (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {app.type} application
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Updated {new Date(app.updatedAt).toLocaleDateString()}
              </Typography>
            </Box>
            <StatusChip status={app.status} />
          </Stack>

          {app.status === FellowshipApplicationStatus.REJECTED && app.reviewerRemarks && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <strong>Reviewer remarks:</strong> {app.reviewerRemarks}
            </Alert>
          )}

          {app.status === FellowshipApplicationStatus.CHANGES_REQUESTED && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <strong>Changes requested by {app.reviewedByName ?? 'the reviewer'}:</strong>{' '}
              {app.reviewerRemarks ??
                'Please revise your proposal before resubmitting.'}
            </Alert>
          )}

          {resubmitError && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setResubmitError(null)}
            >
              {resubmitError}
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

          {app.status === FellowshipApplicationStatus.CHANGES_REQUESTED && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => navigate(`/fellowship/apply?appId=${app.id}`)}
              >
                Edit proposal
              </Button>
              <Button
                variant="outlined"
                onClick={handleResubmit}
                disabled={submitMut.isPending}
                startIcon={<RefreshCw size={14} />}
                sx={{ color: 'text.primary', borderColor: 'divider' }}
              >
                {submitMut.isPending ? 'Resubmitting…' : 'Resubmit as-is'}
              </Button>
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

export default MyFellowships;
