import { CohortType, UserRole, ComponentRating, CohortComponent, OpportunityInterest, FellowshipInterest } from './enums.ts';

export interface PaginatedQueryDto {
  pageSize: number;
  page: number;
}

export interface PaginatedDataDto<TData> {
  totalRecords: number;
  records: TData[];
}

export interface UpdateCohortRequestDto {
  startDate?: string;
  registrationDeadline?: string;
}

export interface CreateCohortRequestDto {
  type: CohortType;
  startDate: string;
  registrationDeadline: string;
}

export interface CohortWeekQuestion {
  text: string;
  attachments: string[];
}

// Instruction-sheet content is no longer edited via the API — it comes from the
// course config files and is applied with POST /cohorts/:id/sync-from-config.
// PATCH /cohorts/weeks/:id now only carries operational (non-config) fields.
export interface UpdateCohortWeekRequestDto {
  scheduledDate?: string;
  classroomAssignmentId?: string;
}

export interface JoinWaitlistRequestDto {
  type: CohortType;
}

// --- Instruction-sheet content shapes (served by GET /cohorts/:id) ---

export interface ReadingMaterialLink {
  label: string;
  url: string;
}

// Links are pre-filtered by role server-side; the UI renders exactly what it receives.
export interface CohortQuickLink {
  label: string;
  url: string;
}

// Node-setup exercise for a single week (drives the "Exercises" tab), or null.
export interface CohortWeekExercise {
  title: string;
  concepts: string;
  problem: string;
  expectedOutput: string[];
}

export type CohortWeekType = 'ORIENTATION' | 'GROUP_DISCUSSION' | 'GRADUATION';

export interface GetCohortWeekResponseDto {
  id: string;
  week: number;
  type: CohortWeekType;
  hasExercise: boolean;
  title: string | null;
  questions: CohortWeekQuestion[];
  // Empty ([]) for STUDENTs — bonus content is role-filtered server-side.
  bonusQuestions: CohortWeekQuestion[];
  readingMaterial: ReadingMaterialLink[];
  activity: string | null;
  exercise: CohortWeekExercise | null;
  classroomAssignmentUrl: string | null;
  classroomInviteLink: string | null;
  scheduledDate: string | null;
}

export interface GetCohortResponseDto {
  id: string;
  type: CohortType;
  displayName: string;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  // Graded GitHub-Classroom flag — NOT the Exercises tab (that is driven per-week).
  hasExercises: boolean;
  classroomId: string | null;
  // Already role-filtered server-side.
  links: CohortQuickLink[];
  weeks: GetCohortWeekResponseDto[];
}

export interface UserCohortWaitlistResponseDto {
  cohortWaitlist: CohortType[];
}

export interface UpdateScoresRequestDto {
  attendance?: boolean;
  communicationScore?: number;
  depthOfAnswerScore?: number;
  technicalBitcoinFluencyScore?: number;
  engagementScore?: number;
  isBonusAttempted?: boolean;
  bonusAnswerScore?: number;
  bonusFollowupScore?: number;
  isSubmitted?: boolean;
  isPassing?: boolean;
  groupNumber?: number;
  teachingAssistantId?: string;
}


export interface GroupDiscussionScore {
  id: string;
  attendance: boolean;
  communicationScore: number;
  maxCommunicationScore: number;
  depthOfAnswerScore: number;
  maxDepthOfAnswerScore: number;
  technicalBitcoinFluencyScore: number;
  maxTechnicalBitcoinFluencyScore: number;
  engagementScore: number;
  maxEngagementScore: number;
  isBonusAttempted: boolean;
  bonusAnswerScore: number;
  maxBonusAnswerScore: number;
  bonusFollowupScore: number;
  maxBonusFollowupScore: number;
  totalScore: number;
  maxTotalScore: number;
  groupNumber: number | null;
  teachingAssistant?: {
    id: string;
    name: string | null;
    discordUsername: string;
    discordGlobalName: string | null;
  } | null;
}

export interface ExerciseScore {
  id: string;
  isSubmitted: boolean;
  isPassing: boolean;
  totalScore: number;
  maxTotalScore: number;
}

export interface AttendanceScore {
  totalScore: number;
  maxTotalScore: number;
}

export interface WeeklyScore {
  weekId: string;
  attended: boolean;
  groupDiscussionScores: GroupDiscussionScore | null;
  exerciseScores: ExerciseScore | null;
  attendanceScores: AttendanceScore | null;
  totalScore: number;
  maxTotalScore: number;
}

export interface UsersWeekScoreResponseDto extends WeeklyScore {
  userId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  name: string | null;
  discordRoleAssigned: boolean;
  teachingAssistant: {
    id: string;
    name: string | null;
    discordUsername: string;
    discordGlobalName: string | null;
  } | null;
}

export interface ListScoresForCohortAndWeekResponseDto {
  scores: UsersWeekScoreResponseDto[];
}

export interface GetCohortScoresResponseDto {
  cohortId: string;
  cohortType: CohortType;
  seasonNumber: number;
  weeklyScores: WeeklyScore[];
  totalScore: number;
  maxTotalScore: number;
}

export interface GetUsersScoresResponseDto {
  cohorts: GetCohortScoresResponseDto[];
  totalScore: number;
  maxTotalScore: number;
}

export interface UpdateUserRequest {
  name?: string;
  description?: string;
  background?: string;
  githubProfileUrl?: string;
  skills?: string[];
  firstHeardAboutBitcoinOn?: string;
  bitcoinBooksRead?: string[];
  whyBitcoin?: string;
  weeklyCohortCommitmentHours?: number;
  location?: string;
  referral?: string;
}

export interface UpdateUserRoleRequest {
  userId: string;
  role: UserRole;
}

export interface GetUserResponse {
  id: string;
  email: string;
  discordUsername: string;
  discordGlobalName: string | null;
  name: string | null;
  role: UserRole;
  description: string | null;
  background: string | null;
  githubProfileUrl: string | null;
  skills: string[] | null;
  // ISO date (YYYY-MM-DD) of when first heard about Bitcoin
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[] | null;
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
  referral: string | null;
}

export interface GetTeachingAssistantResponseDto {
  id: string;
  email: string;
  discordUserId: string;
  discordUserName: string;
  discordGlobalName: string | null;
  name: string | null;
}

export interface LeaderboardEntryDto {
  userId: string;
  name: string | null;
  discordUsername: string;
  discordGlobalName: string | null;
  groupDiscussionTotalScore: number;
  groupDiscussionMaxTotalScore: number;
  exerciseTotalScore: number;
  exerciseMaxTotalScore: number;
  totalScore: number;
  maxTotalScore: number;
  totalAttendance: number;
  maxAttendance: number;
}

export type GetCohortLeaderboardResponseDto = LeaderboardEntryDto[] | { leaderboard: LeaderboardEntryDto[] };

// =========================
// Feedback
// =========================

export type ComponentRatingsDto = Partial<Record<CohortComponent, ComponentRating>>;

export interface CreateFeedbackRequestDto {
  componentRatings?: ComponentRatingsDto;
  expectations?: string;
  improvements?: string;
  opportunityInterests?: OpportunityInterest[];
  fellowshipInterests?: FellowshipInterest[];
  idealProject?: string;
  testimonial?: string;
}

export type UpdateFeedbackRequestDto = CreateFeedbackRequestDto;

export interface GetFeedbackResponseDto {
  id: string;
  userName: string | null;
  userEmail: string | null;
  componentRatings: ComponentRatingsDto | null;
  expectations: string | null;
  improvements: string | null;
  opportunityInterests: string[];
  fellowshipInterests: string[];
  idealProject: string | null;
  testimonial: string | null;
  cohortId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackResponseDto {
  id: string;
  message: string;
}

// =========================
// Certificates
// =========================

export type CertificateType = 'PARTICIPANT' | 'PERFORMER';

export interface GetCertificateResponseDto {
  id: string;
  userId: string;
  cohortId: string;
  name: string;
  certificateType: CertificateType;
  withExercises: boolean;
  rank: 1 | 2 | 3 | null;
  createdAt: string;
}

export interface CertificatePreviewResponseDto {
  userId: string;
  name: string;
  certificateType: CertificateType;
  rank: 1 | 2 | 3 | null;
  withExercises: boolean;
}
