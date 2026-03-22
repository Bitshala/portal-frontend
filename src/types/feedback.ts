import type { CohortComponent, ComponentRating, OpportunityInterest, FellowshipInterest } from './enums';

export type NotificationType = 'success' | 'error';

export interface NotificationState {
  show: boolean;
  message: string;
  type: NotificationType;
}

export interface FeedbackFormData {
  cohortId: string;
  componentRatings: Partial<Record<CohortComponent, ComponentRating>>;
  expectations: string;
  improvements: string;
  opportunityInterests: OpportunityInterest[];
  fellowshipInterests: FellowshipInterest[];
  idealProject: string;
  testimonial: string;
}
