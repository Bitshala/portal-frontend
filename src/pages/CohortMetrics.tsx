import { useState, useMemo } from 'react';
import { Box, Typography, CircularProgress, Select, MenuItem } from '@mui/material';
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
import { BarChart3, Clock } from 'lucide-react';
import { useCohortMetrics } from '../hooks/cohortHooks';
import { computeStatus, COHORT_TYPES } from '../utils/cohortUtils';
import { cohortTypeToName, cohortTypeToShortName } from '../helpers/cohortHelpers';
import type { CohortMetricsRowDto } from '../types/api';
import type { CohortType } from '../types/enums';

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
  endDate: string | null;
  totalParticipants: number;
  retainedStudents: number;
  // null = not yet meaningful (see field notes in the metrics endpoint contract), not a real 0%.
  retentionRate: number | null;
  avgAttendanceRate: number | null;
  completionRate: number | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

const toCohortMetric = (row: CohortMetricsRowDto): CohortMetric => {
  const hasParticipants = row.totalParticipants > 0;
  const hasEnded = !!row.endDate && new Date(row.endDate).getTime() <= Date.now();
  return {
    cohortId: row.cohortId,
    label: `${cohortTypeToName(row.cohortType)} S${row.seasonNumber}`,
    shortLabel: `${cohortTypeToShortName(row.cohortType)} S${row.seasonNumber}`,
    type: row.cohortType,
    season: row.seasonNumber,
    startDate: row.startDate,
    endDate: row.endDate,
    totalParticipants: row.totalParticipants,
    retainedStudents: row.retainedStudents,
    retentionRate: hasParticipants ? round1(row.retentionRate * 100) : null,
    avgAttendanceRate: hasParticipants ? round1(row.avgAttendanceRate * 100) : null,
    completionRate: hasEnded ? round1(row.completionRate * 100) : null,
  };
};

// endDate is null when the cohort has no weeks scheduled yet — computeStatus
// has no notion of that, so treat it as Upcoming before falling through.
const cohortStatus = (m: CohortMetric): 'Completed' | 'Active' | 'Upcoming' =>
  m.endDate ? computeStatus(m.startDate, m.endDate) : 'Upcoming';

const formatComputedAt = (iso: string) =>
  `${new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(iso))} UTC`;

const formatRate = (value: number | null | undefined) => (value == null ? '—' : `${value}%`);

// LabelList's formatter is typed for its broader RenderableText prop, not our number|null domain.
const formatBarLabel = (value: unknown) => formatRate(typeof value === 'number' ? value : null);

type MetricTab = 'retention' | 'completion';

const METRIC_CONFIG: Record<MetricTab, { key: 'retentionRate' | 'completionRate'; label: string; color: string }> = {
  retention: { key: 'retentionRate', label: 'Retention', color: '#4ade80' },
  completion: { key: 'completionRate', label: 'Completion', color: '#38bdf8' },
};

type MetricsTooltipPayload = Array<{ value?: number | string; payload?: CohortMetric }>;

const MetricTooltip = ({ active, payload, metric }: { active?: boolean; payload?: MetricsTooltipPayload; metric: MetricTab }) => {
  if (!active || !payload?.length) return null;
  const cohort = payload[0]?.payload;
  const config = METRIC_CONFIG[metric];
  const rawValue = cohort ? cohort[config.key] : null;

  return (
    <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 180 }}>
      <Typography sx={{ color: '#fb923c', fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
        {cohort?.label ?? ''}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: config.color }} />
          <Typography sx={{ color: config.color, fontSize: '0.8rem', fontWeight: 600 }}>{config.label}</Typography>
        </Box>
        <Typography sx={{ color: config.color, fontSize: '0.8rem', fontWeight: 700 }}>
          {formatRate(rawValue)}
        </Typography>
      </Box>
    </Box>
  );
};

const percentTick = (value: number) => `${value}%`;

const MetricCard = ({ metric, data }: { metric: MetricTab; data: CohortMetric[] }) => {
  const config = METRIC_CONFIG[metric];
  const rankedData = useMemo(
    () => [...data].sort((a, b) => (b[config.key] ?? -1) - (a[config.key] ?? -1)),
    [data, config.key],
  );

  return (
    <Box sx={{ flex: 1, minWidth: 0, bgcolor: '#1c1c1f', border: '1px solid #27272a', borderRadius: 2, p: 3 }}>
      <Typography sx={{ fontWeight: 600, color: config.color, fontSize: '1rem', mb: 2 }}>
        {config.label} rate by cohort
      </Typography>

      <Box sx={{ width: '100%', height: 380 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rankedData} margin={{ top: 24, right: 8, left: 0, bottom: 48 }} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#323238" vertical={false} />
            <XAxis
              dataKey="shortLabel"
              tick={{ fill: '#d4d4d8', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={60}
            />
            <YAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={percentTick}
              width={40}
            />
            <RechartsTooltip content={<MetricTooltip metric={metric} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey={config.key} name={config.label} fill={config.color} activeBar={{ fill: config.color }} radius={[4, 4, 0, 0]} maxBarSize={48}>
              <LabelList dataKey={config.key} position="top" formatter={formatBarLabel} style={{ fill: config.color, fontSize: 10, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

const CohortMetrics = () => {
  const [cohortTypeFilter, setCohortTypeFilter] = useState<CohortType | 'All'>('All');

  const { data, isLoading } = useCohortMetrics();

  const metricsData: CohortMetric[] = useMemo(
    () => (data?.cohorts ?? []).map(toCohortMetric),
    [data],
  );

  // This page only ever shows finished cohorts — completion/retention are
  // both fully meaningful once a cohort has ended, unlike mid-run numbers.
  const filteredCohorts = useMemo(() => {
    const completed = metricsData.filter((m) => cohortStatus(m) === 'Completed');
    if (cohortTypeFilter === 'All') return completed;
    return completed.filter((m) => m.type === cohortTypeFilter);
  }, [metricsData, cohortTypeFilter]);

  const chronologicalData = useMemo(
    () => [...filteredCohorts].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [filteredCohorts],
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#fb923c' }} />
      </Box>
    );
  }

  // Before the first daily job run the endpoint returns computedAt: null with no cohorts.
  if (!data?.computedAt) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <BarChart3 size={28} color="#fb923c" />
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#fafafa', fontSize: { xs: '1.5rem', md: '2rem' } }}>
            Cohort Metrics
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: '#71717a', fontSize: '1rem' }}>
            Metrics haven't been computed yet. Check back after the next daily run.
          </Typography>
        </Box>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
          <Clock size={13} color="#52525b" />
          <Typography sx={{ color: '#52525b', fontSize: '0.75rem' }}>
            Metrics last computed {formatComputedAt(data.computedAt)}
          </Typography>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Select
          value={cohortTypeFilter}
          onChange={(e) => setCohortTypeFilter(e.target.value as CohortType | 'All')}
          size="small"
          sx={{
            minWidth: 220,
            bgcolor: '#27272a',
            color: '#e4e4e7',
            fontSize: '0.8rem',
            fontWeight: 600,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3f3f46' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#52525b' },
            '& .MuiSvgIcon-root': { color: '#a1a1aa' },
          }}
          MenuProps={{ PaperProps: { sx: { bgcolor: '#1c1c1f', border: '1px solid #27272a' } } }}
        >
          <MenuItem value="All" sx={{ color: '#e4e4e7', fontSize: '0.85rem' }}>All Cohorts</MenuItem>
          {COHORT_TYPES.map((type) => (
            <MenuItem key={type} value={type} sx={{ color: '#e4e4e7', fontSize: '0.85rem' }}>
              {cohortTypeToName(type)}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {chronologicalData.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: '#71717a', fontSize: '1rem' }}>
            No completed cohorts available for the selected filter.
          </Typography>
        </Box>
      )}

      {chronologicalData.length > 0 && (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <MetricCard metric="retention" data={chronologicalData} />
          <MetricCard metric="completion" data={chronologicalData} />
        </Box>
      )}
    </Box>
  );
};

export default CohortMetrics;
