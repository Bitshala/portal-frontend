import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { ArrowLeft, Award, CheckCircle2, Github, GraduationCap, ShieldCheck } from 'lucide-react';

import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import StatusChip from '../../../components/fellowship/StatusChip';
import LinkChip from '../../../components/fellowship/LinkChip';
import { fontFamilyMono } from '../../../components/fellowship/theme';
import { ProfileDataCard } from '../../../components/student/ProfileDataCard';
import RoleBadge from '../../../components/user/RoleBadge';
import { useUserOverview } from '../../../hooks/userHooks';
import { FellowshipType } from '../../../types/fellowship';
import type {
  UserOverviewCohortDto,
  UserOverviewFellowshipDto,
} from '../../../types/userOverview';
import { cohortTypeToName, formatCohortDate } from '../../../helpers/cohortHelpers';
import { formatFellowshipType } from '../../../utils/fellowshipFormat';
import { formatCertificateRank, formatCertificateType, formatUserRole } from '../../../utils/userFormat';
import { extractErrorMessage, isBadFilterError } from '../../../utils/errorUtils';

const TRACK_COLORS: Record<FellowshipType, string> = {
  [FellowshipType.DEVELOPER]: '#fb923c',
  [FellowshipType.DESIGNER]: '#60a5fa',
  [FellowshipType.EDUCATOR]: '#a78bfa',
};

const formatDate = (iso: string | null): string =>
  iso ? formatCohortDate(iso) : '—';

const formatPayout = (amountUsd: string | null): string => {
  if (!amountUsd) return '—';
  const n = Number(amountUsd);
  return Number.isNaN(n) ? amountUsd : `$${n.toFixed(2)}`;
};

const UserOverview = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useUserOverview(userId ?? '', {
    enabled: !!userId,
  });

  return (
    <FellowshipPageLayout>
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate('/admin/users')}
        sx={{
          color: 'text.secondary',
          textTransform: 'none',
          fontWeight: 500,
          mb: 2,
          px: 1.5,
          '&:hover': { color: 'text.primary', bgcolor: 'rgba(255,255,255,0.05)' },
        }}
      >
        Back to users
      </Button>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={24} />
        </Box>
      ) : isError ? (
        // The overview endpoint returns 400 both for a non-UUID id and an unknown
        // user — surface a friendly not-found state rather than a raw error.
        isBadFilterError(error) ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '1.15rem', fontWeight: 700, color: '#fafafa', mb: 1 }}>
              User not found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This user doesn't exist, or the id is invalid.
            </Typography>
          </Box>
        ) : (
          <Alert severity="error">{`Couldn't load user: ${extractErrorMessage(error)}`}</Alert>
        )
      ) : data ? (
        <>
          {/* Header / profile summary */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: '#fff', fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
            >
              {data.profile.name || data.profile.discordGlobalName || data.profile.discordUsername}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mt: 1.25, rowGap: 1 }}
            >
              <RoleBadge role={data.profile.role} />
              {data.isGuildMember && (
                <Pill
                  label="Guild member"
                  bg="rgba(74,222,128,0.12)"
                  color="#4ade80"
                  border="rgba(74,222,128,0.3)"
                  icon={<ShieldCheck size={13} />}
                />
              )}
              <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.78rem', color: 'text.secondary' }}>
                Joined {formatCohortDate(data.joinedAt)}
              </Typography>
            </Stack>
          </Box>

          {/* Show the readable role label in the profile card's Role row (the shared
              component renders profile.role verbatim); the header badge is separate. */}
          <ProfileDataCard profile={{ ...data.profile, role: formatUserRole(data.profile.role) }} />

          {/* Cohorts */}
          <Box sx={{ mt: 5 }}>
            <SectionHeading
              icon={<GraduationCap size={20} color="#fb923c" />}
              title="Cohorts"
              summary={`${data.cohortSummary.enrolledCount} enrolled · ${data.cohortSummary.completedCount} completed`}
            />
            {data.cohorts.length === 0 ? (
              <EmptyLine>No cohort enrollments.</EmptyLine>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    minWidth: 680,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 0.75,
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={cohortHeaderSx}>
                    <Box>Cohort</Box>
                    <Box>Score</Box>
                    <Box>Attendance</Box>
                    <Box>Status</Box>
                    <Box>Certificate</Box>
                  </Box>
                  {data.cohorts.map((c) => (
                    <CohortRow key={c.cohortId} cohort={c} />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Fellowships */}
          <Box sx={{ mt: 5 }}>
            <SectionHeading
              icon={<Award size={20} color="#fb923c" />}
              title="Fellowships"
              summary={`${data.fellowshipSummary.totalCount} total · ${data.fellowshipSummary.completedCount} completed`}
            />
            {data.fellowships.length === 0 ? (
              <EmptyLine>No fellowships.</EmptyLine>
            ) : (
              <Stack spacing={1.5}>
                {data.fellowships.map((f) => (
                  <FellowshipCard key={f.id} fellowship={f} />
                ))}
              </Stack>
            )}
          </Box>
        </>
      ) : null}
    </FellowshipPageLayout>
  );
};

// ---- shared bits ----

const cohortHeaderSx = {
  display: 'grid',
  gridTemplateColumns:
    'minmax(180px, 1.8fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(110px, 0.9fr) minmax(140px, 1.2fr)',
  columnGap: 2,
  px: 2,
  py: 1,
  borderBottom: '1px solid',
  borderColor: 'divider',
  color: 'text.secondary',
  fontSize: '0.66rem',
  letterSpacing: 0.8,
  fontWeight: 700,
  textTransform: 'uppercase',
} as const;

const SectionHeading = ({
  icon,
  title,
  summary,
}: {
  icon: ReactNode;
  title: string;
  summary: string;
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      mb: 2,
      pb: 1.5,
      borderBottom: '1px solid',
      borderColor: 'divider',
      flexWrap: 'wrap',
    }}
  >
    {icon}
    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.15rem' }}>{title}</Typography>
    <Typography sx={{ ml: 0.5, color: 'text.secondary', fontSize: '0.85rem' }}>{summary}</Typography>
  </Box>
);

const EmptyLine = ({ children }: { children: ReactNode }) => (
  <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
    {children}
  </Typography>
);

const Pill = ({
  label,
  bg,
  color,
  border,
  icon,
}: {
  label: string;
  bg: string;
  color: string;
  border: string;
  icon?: ReactNode;
}) => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      px: 1,
      py: 0.4,
      borderRadius: 999,
      bgcolor: bg,
      color,
      border: `1px solid ${border}`,
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
    }}
  >
    {icon}
    {label}
  </Box>
);

const CohortRow = ({ cohort }: { cohort: UserOverviewCohortDto }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns:
        'minmax(180px, 1.8fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(110px, 0.9fr) minmax(140px, 1.2fr)',
      columnGap: 2,
      alignItems: 'center',
      px: 2,
      py: 1.5,
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-of-type': { borderBottom: 'none' },
    }}
  >
    {/* Cohort */}
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
        {cohortTypeToName(cohort.cohortType)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        Season {cohort.seasonNumber}
      </Typography>
    </Box>

    {/* Score */}
    <Box sx={{ fontFamily: fontFamilyMono, fontSize: '0.8rem' }}>
      <Box component="span">
        {cohort.totalScore}/{cohort.maxTotalScore}
      </Box>{' '}
      <Box component="span" sx={{ color: 'text.secondary' }}>
        ({cohort.scorePercent}%)
      </Box>
    </Box>

    {/* Attendance */}
    <Box sx={{ fontFamily: fontFamilyMono, fontSize: '0.8rem' }}>
      <Box component="span">
        {cohort.attendedWeeks}/{cohort.totalWeeks}
      </Box>{' '}
      <Box component="span" sx={{ color: 'text.secondary' }}>
        ({cohort.attendancePercent}%)
      </Box>
    </Box>

    {/* Status */}
    <Box>
      {cohort.completed ? (
        <Pill
          label="Completed"
          bg="rgba(74,222,128,0.12)"
          color="#4ade80"
          border="rgba(74,222,128,0.3)"
          icon={<CheckCircle2 size={13} />}
        />
      ) : (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>—</Typography>
      )}
    </Box>

    {/* Certificate */}
    <Box>
      {cohort.certificate ? (
        <Pill
          label={
            formatCertificateType(cohort.certificate.certificateType) +
            (formatCertificateRank(cohort.certificate.rank)
              ? ` · ${formatCertificateRank(cohort.certificate.rank)}`
              : '')
          }
          bg={
            cohort.certificate.certificateType === 'PERFORMER'
              ? 'rgba(251,191,36,0.12)'
              : 'rgba(96,165,250,0.12)'
          }
          color={cohort.certificate.certificateType === 'PERFORMER' ? '#fbbf24' : '#60a5fa'}
          border={
            cohort.certificate.certificateType === 'PERFORMER'
              ? 'rgba(251,191,36,0.3)'
              : 'rgba(96,165,250,0.3)'
          }
        />
      ) : (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>—</Typography>
      )}
    </Box>
  </Box>
);

const FellowshipCard = ({ fellowship }: { fellowship: UserOverviewFellowshipDto }) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 1,
      bgcolor: 'background.paper',
      p: 2,
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ mb: 1 }}
    >
      <Typography
        sx={{
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: 0.4,
          color: TRACK_COLORS[fellowship.type],
        }}
      >
        {formatFellowshipType(fellowship.type)}
      </Typography>
      <StatusChip status={fellowship.status} />
    </Stack>

    <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, mb: 1 }}>
      {fellowship.projectName || (
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
          No project name
        </Box>
      )}
    </Typography>

    <Stack direction="row" spacing={2.5} flexWrap="wrap" sx={{ rowGap: 1, mb: fellowship.projectGithubLink ? 1.5 : 0 }}>
      <Meta label="Dates" value={`${formatDate(fellowship.startDate)} → ${formatDate(fellowship.endDate)}`} />
      <Meta label="Amount" value={formatPayout(fellowship.amountUsd)} />
    </Stack>

    {fellowship.projectGithubLink && (
      <LinkChip
        href={fellowship.projectGithubLink}
        icon={<Github size={14} />}
        label={fellowship.projectGithubLink}
      />
    )}
  </Box>
);

const Meta = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography
      sx={{
        fontSize: '0.62rem',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        fontWeight: 700,
        color: 'text.secondary',
        mb: 0.25,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.82rem' }}>{value}</Typography>
  </Box>
);

export default UserOverview;
