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
import { BarChart3, Info } from 'lucide-react';
import { useCohortMetrics } from '../hooks/cohortHooks';
import { computeStatus } from '../utils/cohortUtils';
import { cohortTypeToName, cohortTypeToShortName } from '../helpers/cohortHelpers';
import type { CohortStatus } from '../types/cohort';
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
  totalParticipants: number;
  retainedStudents: number;
  retentionRate: number;
  avgAttendanceRate: number;
  completionRate: number;
}

// API rates arrive as unrounded fractions in [0, 1]; the chart works on a 0–100
// scale, so convert once here (rounded to 1 dp) rather than at each render site.
const toPercent = (frac: number) => Math.round(frac * 1000) / 10;

// The metrics endpoint's endDate is nullable; computeStatus needs a real end date,
// so a cohort with no end yet can only be Upcoming (future start) or Active.
const deriveStatus = (startDate: string, endDate: string | null): CohortStatus =>
  endDate
    ? computeStatus(startDate, endDate)
    : new Date(startDate) > new Date()
      ? 'Upcoming'
      : 'Active';

const formatComputedAt = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

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
    <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 200 }}>
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
      {cohort && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #3f3f46' }}>
          {[
            { label: 'Avg attendance', value: `${cohort.avgAttendanceRate}%` },
            { label: 'Participants', value: `${cohort.totalParticipants}` },
            { label: 'Retained', value: `${cohort.retainedStudents}` },
          ].map((row) => (
            <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.25 }}>
              <Typography sx={{ color: '#a1a1aa', fontSize: '0.78rem' }}>{row.label}</Typography>
              <Typography sx={{ color: '#d4d4d8', fontSize: '0.78rem', fontWeight: 600 }}>{row.value}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

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

  const { data: metricsResponse, isLoading } = useCohortMetrics();
  const computedAt = metricsResponse?.computedAt ?? null;

  const metricsData: CohortMetric[] = useMemo(() => {
    const cohorts = metricsResponse?.cohorts ?? [];
    return cohorts
      .filter((m) => {
        const status = deriveStatus(m.startDate, m.endDate);
        if (statusFilter === 'All') return status !== 'Upcoming';
        return status === statusFilter;
      })
      .map((m) => ({
        cohortId: m.cohortId,
        label: `${cohortTypeToName(m.cohortType)} S${m.seasonNumber}`,
        shortLabel: `${cohortTypeToShortName(m.cohortType)} S${m.seasonNumber}`,
        type: m.cohortType,
        season: m.seasonNumber,
        startDate: m.startDate,
        totalParticipants: m.totalParticipants,
        retainedStudents: m.retainedStudents,
        retentionRate: toPercent(m.retentionRate),
        avgAttendanceRate: toPercent(m.avgAttendanceRate),
        completionRate: toPercent(m.completionRate),
      }));
  }, [metricsResponse, statusFilter]);

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: '#fb923c' }} />
      </Box>
    );
  }

  // computedAt is null only before the first daily precompute run (fresh deploy).
  const notYetComputed = computedAt === null;

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
          Retention and completion across cohorts and seasons, from a daily snapshot.
        </Typography>
        {computedAt && (
          <Typography sx={{ color: '#52525b', fontSize: '0.78rem', mt: 0.5 }}>
            Last updated {formatComputedAt(computedAt)}
          </Typography>
        )}
      </Box>

      {notYetComputed ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: '#71717a', fontSize: '1rem' }}>
            Metrics are being computed… check back shortly.
          </Typography>
        </Box>
      ) : (
        <>
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

          {statusFilter !== 'Completed' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mb: 3,
                px: 1.5,
                py: 1,
                bgcolor: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.25)',
                borderRadius: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', mt: '2px', flexShrink: 0 }}>
                <Info size={15} color="#fb923c" />
              </Box>
              <Typography sx={{ color: '#d4d4d8', fontSize: '0.78rem', lineHeight: 1.5 }}>
                Completion rate only counts once a cohort has ended — in-progress cohorts read 0%.
              </Typography>
            </Box>
          )}

          {chronologicalData.length === 0 && (
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
                  { name: 'Retention', formula: 'attendees of the latest past GD session / total participants' },
                  { name: 'Completion', formula: 'share meeting certificate attendance (≤1–2 GD absences); 0 until the cohort ends' },
                  { name: 'Attendance', formula: 'average attendance across GD sessions held so far' },
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
        </>
      )}
    </Box>
  );
};

export default CohortMetrics;
