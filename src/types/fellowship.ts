import type { PaginatedQueryDto } from './api.ts';
import type { SortOrder } from './api.ts';

export enum FellowshipType {
  DEVELOPER = 'DEVELOPER',
  DESIGNER = 'DESIGNER',
  EDUCATOR = 'EDUCATOR',
}

export enum FellowshipApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

export enum FellowshipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum FellowshipReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// =========================
// Fellowship Applications
// =========================

export interface GetFellowshipApplicationResponseDto {
  id: string;
  type: FellowshipType;
  status: FellowshipApplicationStatus;
  reviewerRemarks: string | null;
  applicantId: string;
  applicantName: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetFellowshipApplicationProposalResponseDto {
  proposal: string;
}

export interface CreateFellowshipApplicationRequestDto {
  type: FellowshipType;
  proposal: string;
}

export interface UpdateFellowshipApplicationRequestDto {
  proposal: string;
}

export interface ReviewFellowshipApplicationRequestDto {
  status:
    | FellowshipApplicationStatus.ACCEPTED
    | FellowshipApplicationStatus.REJECTED
    | FellowshipApplicationStatus.CHANGES_REQUESTED;
  reviewerRemarks?: string;
  // Required when status === ACCEPTED. Must be a Google Drive folder URL —
  // hosts the unsigned contract and is where the fellow uploads their W-8BEN.
  driveFolderUrl?: string;
}

// Sort fields are per-endpoint whitelists — sending anything outside the set
// returns a 400. Search is a single free-text term matched server-side across
// several columns (see the handoff doc), trimmed and capped at 100 chars.
export type FellowshipApplicationsSortBy = 'createdAt' | 'updatedAt';

export interface ListFellowshipApplicationsQueryDto extends PaginatedQueryDto {
  status?: FellowshipApplicationStatus;
  type?: FellowshipType;
  search?: string;
  sortBy?: FellowshipApplicationsSortBy;
  sortOrder?: SortOrder;
}

export interface GithubUserCheckResponseDto {
  // true/false when GitHub answered; null when the check could not be
  // performed (rate limit, network) — callers must treat null as "unknown".
  exists: boolean | null;
}

// =========================
// Fellowships
// =========================

export interface FellowshipOnboardingDto {
  githubProfile: string | null;
  location: string | null;
  academicBackground: string | null;
  graduationYear: number | null;
  professionalExperience: string | null;
  projectName: string | null;
  projectGithubLink: string | null;
  projectMaintainerName: string | null;
  mentorContact: string | null;
  domains: string[] | null;
  codingLanguages: string[] | null;
  educationInterests: string[] | null;
  bitcoinContributions: string | null;
  bitcoinMotivation: string | null;
  bitcoinOssGoal: string | null;
  additionalInfo: string | null;
  questionsForBitshala: string | null;
}

export interface GetFellowshipResponseDto extends FellowshipOnboardingDto {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  // The application this fellowship was created from — links back to the proposal.
  applicationId: string;
  type: FellowshipType;
  status: FellowshipStatus;
  startDate: string | null;
  endDate: string | null;
  amountUsd: string | null;
  createdAt: string;
  updatedAt: string;
}

// `startDate`, `endDate`, `amountUsd` are null for not-yet-contracted
// fellowships — the server sorts those nulls last in both directions.
export type FellowshipsSortBy = 'createdAt' | 'startDate' | 'endDate' | 'amountUsd';

export interface ListFellowshipsQueryDto extends PaginatedQueryDto {
  status?: FellowshipStatus;
  type?: FellowshipType;
  search?: string;
  sortBy?: FellowshipsSortBy;
  sortOrder?: SortOrder;
}

export type UpdateFellowshipOnboardingRequestDto = Partial<FellowshipOnboardingDto>;

export interface StartFellowshipContractRequestDto {
  startDate: string;
  // The backend derives the end date from the start date + duration.
  periodMonths: number;
  amountUsd: number;
}

// =========================
// Fellowship Reports
// =========================

export interface GetFellowshipReportResponseDto {
  id: string;
  month: number;
  year: number;
  status: FellowshipReportStatus;
  reviewerRemarks: string | null;
  fellowshipId: string;
  fellowName: string;
  reviewedById: string | null;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetFellowshipReportContentResponseDto {
  content: string;
}

export interface CreateFellowshipReportRequestDto {
  fellowshipId: string;
  month: number;
  year: number;
  content: string;
}

export interface UpdateFellowshipReportRequestDto {
  content: string;
}

export interface ReviewFellowshipReportRequestDto {
  status: FellowshipReportStatus.APPROVED | FellowshipReportStatus.REJECTED;
  reviewerRemarks?: string;
}

// `period` sorts by reporting period (year then month) in the chosen order.
export type FellowshipReportsSortBy = 'createdAt' | 'updatedAt' | 'period';

export interface ListFellowshipReportsQueryDto extends PaginatedQueryDto {
  status?: FellowshipReportStatus;
  type?: FellowshipType;
  fellowshipId?: string;
  month?: number;
  year?: number;
  search?: string;
  sortBy?: FellowshipReportsSortBy;
  sortOrder?: SortOrder;
}
