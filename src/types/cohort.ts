export type CohortStatus = 'Active' | 'Upcoming' | 'Completed';

export type CohortRow = {
  id: string;
  name: string;
  type: string;
  season: number;
  status: CohortStatus;
  startDate: string;
  endDate: string;
  weeks?: number;
  completedWeeks?: number;
  participants?: number;
  applications?: number;
  raw?: unknown;
};

export type ApiCohortWeek = {
  id: string;
  week: number;
  type: string;
  hasExercise: boolean;
};

export type ApiCohort = {
  id: string;
  type: string;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  weeks: ApiCohortWeek[];
};
