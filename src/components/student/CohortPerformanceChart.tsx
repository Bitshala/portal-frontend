import { Box, Paper, Stack, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cohortTypeToName, cohortTypeToShortName } from '../../helpers/cohortHelpers';
import type { GetCohortScoresResponseDto } from '../../types/api';
import type { CohortType } from '../../types/enums';

export interface CohortPerformancePoint {
  cohortId: string;
  label: string;
  fullLabel: string;
  scorePercent: number;
  totalScore: number;
  maxTotalScore: number;
  seasonNumber: number;
  attendedWeeks: number;
  totalWeeks: number;
  attendancePercent: number;
}

interface CohortPerformanceChartProps {
  cohorts: GetCohortScoresResponseDto[];
  selectedCohortId?: string;
  onSelectCohort?: (cohortId: string) => void;
}

const getBarColor = (score: number, selected: boolean): string => {
  if (selected) return '#fb923c';
  if (score >= 80) return '#4ade80';
  if (score >= 60) return '#facc15';
  if (score >= 40) return '#fdba74';
  if (score > 0) return '#f87171';
  return '#52525b';
};

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
};

export const toCohortPerformancePoints = (
  cohorts: GetCohortScoresResponseDto[],
): CohortPerformancePoint[] =>
  [...cohorts]
    .map((cohort) => {
      const totalWeeks = cohort.weeklyScores?.length ?? 0;
      const attendedWeeks =
        cohort.weeklyScores?.filter(
          (w) => w.attended ?? w.groupDiscussionScores?.attendance,
        ).length ?? 0;
      const scorePercent =
        cohort.maxTotalScore > 0
          ? Math.round((cohort.totalScore / cohort.maxTotalScore) * 100)
          : 0;

      return {
        cohortId: cohort.cohortId,
        label: `${cohortTypeToShortName(cohort.cohortType)} S${cohort.seasonNumber}`,
        fullLabel: `${cohortTypeToName(cohort.cohortType as CohortType)} — Season ${cohort.seasonNumber}`,
        scorePercent,
        totalScore: cohort.totalScore,
        maxTotalScore: cohort.maxTotalScore,
        seasonNumber: cohort.seasonNumber,
        attendedWeeks,
        totalWeeks,
        attendancePercent: totalWeeks > 0 ? Math.round((attendedWeeks / totalWeeks) * 100) : 0,
      };
    })
    .sort((a, b) => a.fullLabel.localeCompare(b.fullLabel));

type ChartTooltipPayload = Array<{
  payload?: CohortPerformancePoint;
}>;

const ChartTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ChartTooltipPayload;
}) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <Box sx={{ ...tooltipStyle, p: 1.5, minWidth: 180 }}>
      <Typography sx={{ color: '#fb923c', fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
        {point.fullLabel}
      </Typography>
      <Stack spacing={0.5}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Score</Typography>
          <Typography sx={{ color: '#fafafa', fontSize: '0.75rem', fontWeight: 600 }}>
            {Math.round(point.totalScore)}/{point.maxTotalScore} ({point.scorePercent}%)
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Typography sx={{ color: '#a1a1aa', fontSize: '0.75rem' }}>Attendance</Typography>
          <Typography sx={{ color: '#fafafa', fontSize: '0.75rem', fontWeight: 600 }}>
            {point.attendedWeeks}/{point.totalWeeks} ({point.attendancePercent}%)
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export const CohortPerformanceChart = ({
  cohorts,
  selectedCohortId,
  onSelectCohort,
}: CohortPerformanceChartProps) => {
  const chartData = toCohortPerformancePoints(cohorts);

  if (chartData.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{ bgcolor: 'transparent', border: '1px solid #3f3f46', borderRadius: 2, p: 2.5 }}
      >
        <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem', mb: 1 }}>
          Performance Across Cohorts
        </Typography>
        <Typography sx={{ color: '#71717a', fontSize: '0.85rem' }}>
          No cohort scores available for this student yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ bgcolor: 'transparent', border: '1px solid #3f3f46', borderRadius: 2, p: 2.5 }}>
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem' }}>
          Performance Across Cohorts
        </Typography>
        <Typography sx={{ color: '#71717a', fontSize: '0.8rem' }}>
          Overall score % for every cohort this student has joined
          {onSelectCohort ? ' — click a bar to inspect that cohort' : ''}
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', height: Math.max(220, chartData.length * 44 + 48) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={72}
              tick={{ fill: '#d4d4d8', fontSize: 12, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(249,115,22,0.08)' }} />
            <Bar
              dataKey="scorePercent"
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
              cursor={onSelectCohort ? 'pointer' : 'default'}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.cohortId}
                  fill={getBarColor(entry.scorePercent, entry.cohortId === selectedCohortId)}
                  cursor={onSelectCohort ? 'pointer' : 'default'}
                  onClick={() => onSelectCohort?.(entry.cohortId)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default CohortPerformanceChart;
