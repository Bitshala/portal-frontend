import { useMemo, type ReactNode } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import apiService from '../services/apiService';
import { useAllFeedback } from '../hooks/feedbackHooks';
import { cohortTypeToName, cohortTypeToShortName } from '../helpers/cohortHelpers';
import {
  averageComponentRating,
  RATING_SCALE_MAX,
  type CohortRatingSeries,
  type SeasonRatingPoint,
} from '../utils/feedbackRatingUtils';
import type { GetCohortResponseDto, GetFeedbackResponseDto } from '../types/api';
import type { CohortType } from '../types/enums';

/** Backend rejects pageSize > 100 */
const FEEDBACK_PAGE_SIZE = 100;

interface FeedbackRatingChartsProps {
  cohorts: GetCohortResponseDto[];
}

const buildRatingSeries = (
  cohorts: GetCohortResponseDto[],
  feedbackByCohortId: Map<string, GetFeedbackResponseDto[]>,
): CohortRatingSeries[] => {
  const byType = new Map<
    CohortType,
    { season: number; startDate: string; label: string; avgRating: number; responseCount: number }[]
  >();

  for (const cohort of cohorts) {
    const records = feedbackByCohortId.get(cohort.id) ?? [];
    const { avgRating, ratingCount, responseCount } = averageComponentRating(records);
    if (ratingCount === 0 || avgRating <= 0) continue;

    const existing = byType.get(cohort.type) ?? [];
    existing.push({
      season: cohort.season,
      startDate: cohort.startDate,
      label: `${cohortTypeToName(cohort.type)} S${cohort.season}`,
      avgRating,
      responseCount,
    });
    byType.set(cohort.type, existing);
  }

  return Array.from(byType.entries())
    .map(([type, seasons]) => {
      const bySeason = new Map<number, (typeof seasons)[number]>();
      for (const entry of seasons) {
        const prev = bySeason.get(entry.season);
        if (!prev || new Date(entry.startDate).getTime() < new Date(prev.startDate).getTime()) {
          bySeason.set(entry.season, entry);
        }
      }

      const points: SeasonRatingPoint[] = Array.from(bySeason.values())
        .sort((a, b) => a.season - b.season)
        .map((s) => ({
          season: s.season,
          seasonLabel: `S${s.season}`,
          avgRating: s.avgRating,
          responseCount: s.responseCount,
          label: s.label,
        }));

      return {
        type,
        name: cohortTypeToName(type),
        shortName: cohortTypeToShortName(type),
        points,
      };
    })
    .filter((series) => series.points.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
};

const formatRating = (value: number) => value.toFixed(1);

const getTrend = (points: SeasonRatingPoint[]) => {
  if (points.length < 2) return null;

  const prev = points[points.length - 2];
  const latest = points[points.length - 1];
  const delta = Math.round((latest.avgRating - prev.avgRating) * 10) / 10;

  if (delta > 0) {
    return {
      label: `rating increased (+${formatRating(delta)})`,
      color: '#4ade80',
      bg: 'rgba(74,222,128,0.12)',
      border: 'rgba(74,222,128,0.3)',
    };
  }
  if (delta < 0) {
    return {
      label: `rating decreased (${formatRating(delta)})`,
      color: '#f87171',
      bg: 'rgba(248,113,113,0.12)',
      border: 'rgba(248,113,113,0.3)',
    };
  }
  return {
    label: 'rating unchanged',
    color: '#a1a1aa',
    bg: 'rgba(161,161,170,0.12)',
    border: 'rgba(161,161,170,0.3)',
  };
};

const SectionShell = ({ children }: { children: ReactNode }) => (
  <Paper
    elevation={0}
    sx={{ bgcolor: '#1c1c1f', border: '1px solid #27272a', borderRadius: 2, p: 3, mb: 3 }}
  >
    {children}
  </Paper>
);

const FeedbackRatingCharts = ({ cohorts }: FeedbackRatingChartsProps) => {
  const firstPageQuery = useAllFeedback({ page: 0, pageSize: FEEDBACK_PAGE_SIZE });
  const totalRecords = firstPageQuery.data?.totalRecords ?? 0;
  const extraPageCount =
    totalRecords > FEEDBACK_PAGE_SIZE
      ? Math.ceil(totalRecords / FEEDBACK_PAGE_SIZE) - 1
      : 0;

  const extraPageQueries = useQueries({
    queries: Array.from({ length: extraPageCount }, (_, i) => {
      const page = i + 1;
      return {
        queryKey: ['feedback', 'all', { page, pageSize: FEEDBACK_PAGE_SIZE }],
        queryFn: () => apiService.listAllFeedback({ page, pageSize: FEEDBACK_PAGE_SIZE }),
        enabled: firstPageQuery.isSuccess && extraPageCount > 0,
      };
    }),
  });

  const isLoading =
    firstPageQuery.isLoading || extraPageQueries.some((q) => q.isLoading);
  const hasError =
    firstPageQuery.isError || extraPageQueries.some((q) => q.isError);

  const ratingSeriesByCohort: CohortRatingSeries[] = useMemo(() => {
    if (!firstPageQuery.data) return [];

    const allFeedback: GetFeedbackResponseDto[] = [...firstPageQuery.data.records];
    for (const q of extraPageQueries) {
      if (q.data?.records) allFeedback.push(...q.data.records);
    }

    const feedbackByCohortId = new Map<string, GetFeedbackResponseDto[]>();
    for (const feedback of allFeedback) {
      const list = feedbackByCohortId.get(feedback.cohortId) ?? [];
      list.push(feedback);
      feedbackByCohortId.set(feedback.cohortId, list);
    }

    return buildRatingSeries(cohorts, feedbackByCohortId);
  }, [cohorts, firstPageQuery.data, extraPageQueries]);

  if (cohorts.length === 0) return null;

  if (isLoading) {
    return (
      <SectionShell>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} sx={{ color: '#fbbf24' }} />
          <Typography sx={{ color: '#71717a', fontSize: '0.8rem' }}>Loading ratings...</Typography>
        </Stack>
      </SectionShell>
    );
  }

  if (hasError) {
    return (
      <SectionShell>
        <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem', mb: 1 }}>
          Cohort Ratings
        </Typography>
        <Typography sx={{ color: '#f87171', fontSize: '0.85rem' }}>
          Couldn’t load feedback ratings. Refresh and try again.
        </Typography>
      </SectionShell>
    );
  }

  if (ratingSeriesByCohort.length === 0) {
    return (
      <SectionShell>
        <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem', mb: 1 }}>
          Cohort Ratings
        </Typography>
        <Typography sx={{ color: '#71717a', fontSize: '0.85rem' }}>
          No component ratings in submissions yet — written feedback alone isn’t enough for this view.
        </Typography>
      </SectionShell>
    );
  }

  return (
    <SectionShell>
      <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem', mb: 0.5 }}>
        Cohort Ratings
      </Typography>
      <Typography sx={{ color: '#a1a1aa', fontSize: '0.8rem', mb: 2.5 }}>
        Latest average component rating (out of {RATING_SCALE_MAX}) vs previous season
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {ratingSeriesByCohort.map((series) => {
          const latest = series.points[series.points.length - 1];
          const prev = series.points.length > 1 ? series.points[series.points.length - 2] : null;
          const trend = getTrend(series.points);

          return (
            <Paper
              key={series.type}
              elevation={0}
              sx={{
                bgcolor: '#111113',
                border: '1px solid #27272a',
                borderRadius: 1.5,
                px: 2.5,
                py: 2,
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
                  <Typography
                    sx={{ color: '#fafafa', fontWeight: 700, fontSize: '1rem', letterSpacing: 0.3 }}
                  >
                    {series.shortName}
                  </Typography>
                  <Typography sx={{ color: '#71717a', fontSize: '0.72rem' }}>
                    S{latest.season}
                  </Typography>
                </Stack>

                <Stack direction="row" alignItems="baseline" spacing={0.75}>
                  <Typography
                    sx={{
                      color: '#fbbf24',
                      fontWeight: 800,
                      fontSize: '2rem',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatRating(latest.avgRating)}
                  </Typography>
                  <Typography sx={{ color: '#52525b', fontSize: '0.85rem', fontWeight: 600 }}>
                    / {RATING_SCALE_MAX}
                  </Typography>
                </Stack>

                {trend && (
                  <Chip
                    size="small"
                    label={trend.label}
                    sx={{
                      alignSelf: 'flex-start',
                      bgcolor: trend.bg,
                      color: trend.color,
                      border: `1px solid ${trend.border}`,
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      height: 24,
                    }}
                  />
                )}

                <Typography sx={{ color: '#52525b', fontSize: '0.72rem' }}>
                  {series.name}
                  {prev
                    ? ` · was ${formatRating(prev.avgRating)} in S${prev.season}`
                    : ` · ${latest.responseCount} response${latest.responseCount === 1 ? '' : 's'}`}
                </Typography>
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </SectionShell>
  );
};

export default FeedbackRatingCharts;
