import type { GetFeedbackResponseDto } from '../types/api';
import { ComponentRating, type CohortType } from '../types/enums';

export const RATING_SCORE: Record<ComponentRating, number> = {
  [ComponentRating.NOT_AT_ALL]: 1,
  [ComponentRating.SOMEWHAT]: 2,
  [ComponentRating.HELPFUL]: 3,
  [ComponentRating.VERY_HELPFUL]: 4,
};

export const RATING_SCALE_MAX = 4;

export const averageComponentRating = (
  feedbacks: GetFeedbackResponseDto[],
): { avgRating: number; ratingCount: number; responseCount: number } => {
  let sum = 0;
  let ratingCount = 0;

  for (const feedback of feedbacks) {
    if (!feedback.componentRatings) continue;
    for (const rating of Object.values(feedback.componentRatings)) {
      if (!rating) continue;
      const score = RATING_SCORE[rating as ComponentRating];
      if (score == null) continue;
      sum += score;
      ratingCount += 1;
    }
  }

  return {
    avgRating: ratingCount > 0 ? Math.round((sum / ratingCount) * 10) / 10 : 0,
    ratingCount,
    responseCount: feedbacks.length,
  };
};

export interface SeasonRatingPoint {
  season: number;
  seasonLabel: string;
  avgRating: number;
  responseCount: number;
  label: string;
}

export interface CohortRatingSeries {
  type: CohortType;
  name: string;
  shortName: string;
  points: SeasonRatingPoint[];
}
