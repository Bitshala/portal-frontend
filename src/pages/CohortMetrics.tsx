import { useState, useMemo } from 'react';
import { Box, Typography, CircularProgress, Chip, IconButton, Tooltip } from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from 'recharts';
import { BarChart3, Users, TrendingUp, Target, Info } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useCohorts } from '../hooks/cohortHooks';
import apiService from '../services/apiService';
import { computeStatus } from '../utils/cohortUtils';
import { cohortTypeToName, cohortTypeToShortName } from '../helpers/cohortHelpers';
import type { LeaderboardEntryDto, GetCohortLeaderboardResponseDto } from '../types/api';
import type { CohortType } from '../types/enums';

const normalizeLeaderboard = (data: GetCohortLeaderboardResponseDto): LeaderboardEntryDto[] => {
  return Array.isArray(data) ? data : data.leaderboard;
};

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
};

interface CohortMetric {
  cohortId: string;
  label: string;
  shortLabel: string;
  type: CohortType;
  season: number;
  startDate: string;
  totalParticipants: number;
  retainedStudents: number;
  retentionRate: number;
  avgAttendanceRate: number;
  completionRate: number;
}

type MetricsTooltipPayload = Array<{
  dataKey?: string;
  value?: number | string;
  payload?: CohortMetric;
}>;

const MetricsTooltip = ({ active, payload }: { active?: boolean; payload?: MetricsTooltipPayload }) => {
  if (!active || !payload?.length) return null;

  const cohort = payload[0]?.payload;
  const rows = payload.map((entry) => {
    const isRetention = entry.dataKey === 'retentionRate';
    return {
      label: isRetention ? 'Retention' : 'Completion',
      color: isRetention ? '#4ade80' : '#38bdf8',
      value: typeof entry.value === 'number' ? `${entry.value}%` : entry.value,
    };
  });

  return (
    <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 180 }}>
      <Typography sx={{ color: '#fb923c', fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
        {cohort?.label ?? ''}
      </Typography>
      {rows.map((row) => (
        <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: row.color }} />
            <Typography sx={{ color: row.color, fontSize: '0.8rem', fontWeight: 600 }}>
              {row.label}
            </Typography>
          </Box>
          <Typography sx={{ color: row.color, fontSize: '0.8rem', fontWeight: 700 }}>
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}) => (
  <Box
    sx={{
      bgcolor: '#1c1c1f',
      border: '1px solid #27272a',
      borderRadius: 2,
      p: 2.5,
      flex: '1 1 200px',
      minWidth: 180,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Icon size={18} color={color} />
      <Typography sx={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
    <Typography
      sx={{ color: '#fafafa', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    {subtitle && (
      <Typography sx={{ color: '#71717a', fontSize: '0.75rem', mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

/* ── Formula info box ── */
const FormulaBox = ({ formulas }: { formulas: { name: string; formula: string }[] }) => (
  <Box
    sx={{
      bgcolor: '#111113',
      border: '1px solid #27272a',
      borderRadius: 1.5,
      px: 2,
      py: 1.5,
      mb: 2,
    }}
  >
    {formulas.map((f, i) => (
      <Typography key={i} sx={{ color: '#71717a', fontSize: '0.72rem', fontFamily: 'monospace', lineHeight: 1.8 }}>
        <span style={{ color: '#a1a1aa', fontWeight: 600 }}>{f.name}</span>{' = '}{f.formula}
      </Typography>
    ))}
  </Box>
);

const percentTick = (value: number) => `${value}%`;

const CohortMetrics = () => {
  const [statusFilter, setStatusFilter] = useState<'Completed' | 'Active' | 'All'>(
    'Completed',
  );
  const [showMetricInfo, setShowMetricInfo] = useState(false);

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts({
    page: 0,
    pageSize: 100,
  });

  const filteredCohorts = useMemo(() => {
    if (!cohortsData) return [];
    return cohortsData.records.filter((c) => {
      const status = computeStatus(c.startDate, c.endDate);
      if (statusFilter === 'All') return status !== 'Upcoming';
      return status === statusFilter;
    });
  }, [cohortsData, statusFilter]);

  const leaderboardQueries = useQueries({
    queries: filteredCohorts.map((cohort) => ({
      queryKey: ['scores', 'cohort', cohort.id, 'leaderboard'],
      queryFn: () => apiService.getCohortLeaderboard(cohort.id),
    })),
  });

  const allLoaded = leaderboardQueries.every((q) => !q.isLoading);
  const anyLoading = leaderboardQueries.some((q) => q.isLoading);

  const metricsData: CohortMetric[] = useMemo(() => {
    return filteredCohorts
      .map((cohort, i) => {
        const leaderboard = leaderboardQueries[i]?.data;
        if (!leaderboard) return null;

        const entries = normalizeLeaderboard(leaderboard);
        const totalParticipants = entries.length;

        if (totalParticipants === 0) {
          return {
            cohortId: cohort.id,
            label: `${cohortTypeToName(cohort.type)} S${cohort.season}`,
            shortLabel: `${cohortTypeToShortName(cohort.type)} S${cohort.season}`,
            type: cohort.type,
            season: cohort.season,
            startDate: cohort.startDate,
            totalParticipants: 0,
            retainedStudents: 0,
            retentionRate: 0,
            avgAttendanceRate: 0,
            completionRate: 0,
          };
        }

        const retainedStudents = entries.filter(
          (e) => e.maxAttendance > 0 && e.totalAttendance / e.maxAttendance >= 0.5,
        ).length;

        const retentionRate = (retainedStudents / totalParticipants) * 100;

        const avgAttendanceRate =
          (entries.reduce(
            (sum, e) => sum + (e.maxAttendance > 0 ? e.totalAttendance / e.maxAttendance : 0),
            0,
          ) / totalParticipants) * 100;

        const completionRate =
          (entries.reduce(
            (sum, e) => sum + (e.maxTotalScore > 0 ? e.totalScore / e.maxTotalScore : 0),
            0,
          ) / totalParticipants) * 100;

        return {
          cohortId: cohort.id,
          label: `${cohortTypeToName(cohort.type)} S${cohort.season}`,
          shortLabel: `${cohortTypeToShortName(cohort.type)} S${cohort.season}`,
          type: cohort.type,
          season: cohort.season,
          startDate: cohort.startDate,
          totalParticipants,
          retainedStudents,
          retentionRate: Math.round(retentionRate * 10) / 10,
          avgAttendanceRate: Math.round(avgAttendanceRate * 10) / 10,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      })
      .filter((m): m is CohortMetric => m !== null);
  }, [filteredCohorts, leaderboardQueries]);

  // Sort by startDate ascending (earliest first) for charts
  const chronologicalData = useMemo(
    () => [...metricsData].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [metricsData],
  );

  const rankedData = useMemo(
    () => [...chronologicalData].sort(
      (a, b) => ((b.retentionRate + b.completionRate) / 2) - ((a.retentionRate + a.completionRate) / 2),
    ),
    [chronologicalData],
  );


  const avgRetention =
    chronologicalData.length > 0
      ? Math.round(
          (chronologicalData.reduce((s, d) => s + d.retentionRate, 0) / chronologicalData.length) * 10,
        ) / 10
      : 0;
  const avgCompletion =
    chronologicalData.length > 0
      ? Math.round(
          (chronologicalData.reduce((s, d) => s + d.completionRate, 0) / chronologicalData.length) * 10,
        ) / 10
      : 0;
  const totalParticipants = chronologicalData.reduce((s, d) => s + d.totalParticipants, 0);

  if (cohortsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#fb923c' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <BarChart3 size={28} color="#fb923c" />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#fafafa', fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Cohort Metrics
          </Typography>
        </Box>
        <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>
          Continuous analysis of retention data across cohorts and seasons
        </Typography>
      </Box>

      {/* Status Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {(['Completed', 'Active', 'All'] as const).map((status) => (
          <Chip
            key={status}
            label={status}
            onClick={() => setStatusFilter(status)}
            sx={{
              bgcolor: statusFilter === status ? 'rgba(249,115,22,0.15)' : '#27272a',
              color: statusFilter === status ? '#fb923c' : '#a1a1aa',
              border: statusFilter === status ? '1px solid #f97316' : '1px solid #3f3f46',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              '&:hover': { bgcolor: statusFilter === status ? 'rgba(249,115,22,0.2)' : '#3f3f46' },
            }}
          />
        ))}
      </Box>

      {anyLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} sx={{ color: '#fb923c' }} />
          <Typography sx={{ color: '#71717a', fontSize: '0.8rem' }}>Loading cohort data...</Typography>
        </Box>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard icon={BarChart3} label="Cohorts Analyzed" value={chronologicalData.length} color="#fb923c" />
        <StatCard icon={TrendingUp} label="Avg Retention Rate" value={`${avgRetention}%`} subtitle="Students attending ≥50% weeks" color="#4ade80" />
        <StatCard icon={Target} label="Avg Completion Rate" value={`${avgCompletion}%`} subtitle="Average score percentage" color="#38bdf8" />
        <StatCard icon={Users} label="Total Participants" value={totalParticipants} color="#a78bfa" />
      </Box>

      {chronologicalData.length === 0 && allLoaded && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: '#71717a', fontSize: '1rem' }}>
            No cohort data available for the selected filter.
          </Typography>
        </Box>
      )}

      {chronologicalData.length > 0 && (
        <Box sx={{ bgcolor: '#1c1c1f', border: '1px solid #27272a', borderRadius: 2, p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <BarChart3 size={20} color="#38bdf8" />
            <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem' }}>
              Retention vs Completion
            </Typography>
            <Tooltip title={showMetricInfo ? 'Hide metric definitions' : 'Show metric definitions'} arrow>
              <IconButton
                size="small"
                onClick={() => setShowMetricInfo((prev) => !prev)}
                sx={{
                  color: showMetricInfo ? '#38bdf8' : '#a1a1aa',
                  bgcolor: showMetricInfo ? 'rgba(56,189,248,0.12)' : 'transparent',
                  border: '1px solid',
                  borderColor: showMetricInfo ? 'rgba(56,189,248,0.35)' : '#3f3f46',
                  p: 0.5,
                  ml: 0.5,
                  '&:hover': { bgcolor: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
                }}
              >
                <Info size={15} />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 22, height: 10, bgcolor: '#4ade80', borderRadius: 1 }} />
              <Typography sx={{ color: '#d4d4d8', fontSize: '0.8rem' }}>
                Green = Retention rate
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 22, height: 10, bgcolor: '#38bdf8', borderRadius: 1 }} />
              <Typography sx={{ color: '#d4d4d8', fontSize: '0.8rem' }}>
                Blue = Completion rate
              </Typography>
            </Box>
          </Box>

          {showMetricInfo && (
            <FormulaBox formulas={[
              { name: 'Retention', formula: 'students with attendance ≥ 50% / total participants × 100' },
              { name: 'Completion', formula: 'average(totalScore / maxTotalScore) × 100' },
            ]} />
          )}

          <Box sx={{ width: '100%', height: Math.max(320, rankedData.length * 52 + 80) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankedData} layout="vertical" margin={{ top: 12, right: 40, left: 28, bottom: 8 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#323238" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={percentTick}
                />
                <YAxis
                  type="category"
                  dataKey="shortLabel"
                  tick={{ fill: '#d4d4d8', fontSize: 12, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={72}
                />
                <RechartsTooltip content={<MetricsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="retentionRate" name="Retention" fill="#4ade80" activeBar={{ fill: '#4ade80' }} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="retentionRate" position="right" formatter={percentTick} style={{ fill: '#4ade80', fontSize: 11, fontWeight: 600 }} />
                </Bar>
                <Bar dataKey="completionRate" name="Completion" fill="#38bdf8" activeBar={{ fill: '#38bdf8' }} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="completionRate" position="right" formatter={percentTick} style={{ fill: '#38bdf8', fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CohortMetrics;
