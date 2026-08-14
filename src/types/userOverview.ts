import type { CertificateType, PaginatedQueryDto, SortOrder } from './api.ts';
import type { CohortType, UserRole } from './enums.ts';
import type { FellowshipStatus, FellowshipType } from './fellowship.ts';

// =========================
// User search (GET /users)
// =========================

// Server-side sort whitelist for the user search endpoint — sending anything
// outside this set is rejected with a 400.
export type UsersSortBy = 'createdAt' | 'name' | 'email';

export interface ListUsersQueryDto extends PaginatedQueryDto {
  // Case-insensitive substring over name, email, and Discord usernames (≤100 chars).
  search?: string;
  sortBy?: UsersSortBy;
  sortOrder?: SortOrder;
}

// One row of the user search results. `displayName` is the server's best label
// for the user; `name`/`email` may be null.
export interface UserSearchResultDto {
  id: string;
  displayName: string;
  name: string | null;
  email: string | null;
  discordUsername: string;
  discordGlobalName: string | null;
  role: UserRole;
  createdAt: string;
}

// =========================
// User overview (GET /users/:id/overview)
// =========================

// Same fields as GetUserResponse, but `email` is nullable here. Fed directly to
// ProfileDataCard (which accepts a superset/loose shape).
export interface UserOverviewProfileDto {
  id: string;
  email: string | null;
  discordUsername: string;
  discordGlobalName: string | null;
  name: string | null;
  role: UserRole;
  description: string | null;
  background: string | null;
  githubProfileUrl: string | null;
  portfolioUrl: string | null;
  linkedinProfileUrl: string | null;
  skills: string[] | null;
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[] | null;
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
  referral: string | null;
}

// A cohort's certificate, or null when none was earned. `rank` is null for
// PARTICIPANT and 1–3 for top PERFORMERs.
export interface UserOverviewCertificateDto {
  certificateType: CertificateType;
  rank: 1 | 2 | 3 | null;
  withExercises: boolean;
  issuedAt: string;
}

// Per-cohort participation. `scorePercent`/`attendancePercent` are already
// rounded 0–100 integers — render directly. `completed` means a certificate was
// earned (server-computed).
export interface UserOverviewCohortDto {
  cohortId: string;
  cohortType: CohortType;
  seasonNumber: number;
  totalScore: number;
  maxTotalScore: number;
  scorePercent: number;
  attendedWeeks: number;
  totalWeeks: number;
  attendancePercent: number;
  completed: boolean;
  certificate: UserOverviewCertificateDto | null;
}

export interface UserOverviewFellowshipDto {
  id: string;
  type: FellowshipType;
  status: FellowshipStatus;
  mentorContact: string | null;
  projectName: string | null;
  projectGithubLink: string | null;
  githubProfile: string | null;
  location: string | null;
  academicBackground: string | null;
  graduationYear: number | null;
  professionalExperience: string | null;
  domains: string[] | null;
  codingLanguages: string[] | null;
  educationInterests: string[] | null;
  bitcoinContributions: string | null;
  bitcoinMotivation: string | null;
  bitcoinOssGoal: string | null;
  additionalInfo: string | null;
  questionsForBitshala: string | null;
  startDate: string | null;
  endDate: string | null;
  amountUsd: string | null;
  userId: string;
  userName: string | null;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserOverviewCohortSummaryDto {
  enrolledCount: number;
  completedCount: number;
}

export interface UserOverviewFellowshipSummaryDto {
  totalCount: number;
  completedCount: number;
}

export interface GetUserOverviewResponseDto {
  profile: UserOverviewProfileDto;
  joinedAt: string;
  isGuildMember: boolean;
  cohortSummary: UserOverviewCohortSummaryDto;
  cohorts: UserOverviewCohortDto[];
  fellowshipSummary: UserOverviewFellowshipSummaryDto;
  fellowships: UserOverviewFellowshipDto[];
}
