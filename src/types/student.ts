// Sort types
export type SortType = 'default' | 'total_score_asc' | 'total_score_desc' | 'exercise_score_asc' | 'exercise_score_desc';

// API Response Types
export interface ApiStudentRecord {
  week: number;
  name: string;
  mail: string;
  group_id: string;
  ta: string;
  attendance: string;
  fa: number;
  fb: number;
  fc: number;
  fd: number;
  bonus_attempt: number;
  bonus_answer_quality: number;
  bonus_follow_up: number;
  exercise_submitted: string;
  exercise_test_passing: string;
  exercise_good_structure: string;
  exercise_good_documentation: string;
  total: number;
}

// Score breakdowns
export interface GdScore {
  fa: number;
  fb: number;
  fc: number;
  fd: number;
}

export interface BonusScore {
  attempt: number;
  good: number;
  followUp: number;
}

export interface ExerciseScore {
  Submitted: boolean;
  privateTest: boolean;
}

// Table/UI Types
export interface TableRowData {
  userId: number;
  id: number;
  name: string;
  discordGlobalName: string;
  email: string;
  group: string;
  ta: string;
  attendance: boolean;
  gdScore: GdScore | null;
  bonusScore: BonusScore | null;
  exerciseScore: ExerciseScore | null;
  week?: number;
  total: number;
}

// Weekly data for student detail view
export interface WeeklyData {
  week: number;
  attendance: boolean;
  gdScore: GdScore;
  bonusScore: BonusScore;
  exerciseScore: ExerciseScore;
  total: number;
  totalScore: number;
  maxTotalScore: number;
  group: string;
  ta: string;
}

export interface StudentData {
  name: string;
  email: string;
  group: string;
  ta: string;
  weeklyData: WeeklyData[];
}

export interface StudentBackground {
  describe_yourself?: string;
  background?: string;
  skills?: string;
  location?: string;
  why?: string;
  year?: string;
  book?: string;
}


// Result page types
export interface StudentResult {
  name: string;
  email: string;
  total_score: number;
  exercise_total_score?: number;
}
