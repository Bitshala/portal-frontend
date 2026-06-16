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

// Structured proposal as returned by GET /fellowship-applications/:id/proposal.
// Each field is stored and validated server-side; `links` and the multi-value
// onboarding fields are always arrays. Onboarding details now live on the
// application itself, so the proposal carries them too. `location` is the one
// exception — it's a profile field, read from GET /users/me, not the proposal.
export interface FellowshipApplicationProposalDto {
  title: string | null;
  problemStatement: string | null;
  plan: string | null;
  mentorName: string | null;
  mentorContact: string | null;
  mentorTestimonial: string | null;
  github: string | null;
  links: string[];
  projectName: string | null;
  projectGithubLink: string | null;
  academicBackground: string | null;
  graduationYear: number | null;
  professionalExperience: string | null;
  domains: string[];
  codingLanguages: string[];
  educationInterests: string[];
  bitcoinContributions: string | null;
  bitcoinMotivation: string | null;
  bitcoinOssGoal: string | null;
  additionalInfo: string | null;
  questionsForBitshala: string | null;
}

// Writable proposal shape for create/update. All fields optional — drafts may be
// partial. Sending a field as "" clears it; omitting a key leaves it untouched.
// `location` and `github` are written through to the user profile by the backend
// (location → user.location, github → user.githubProfileUrl); github is also kept
// on the application, but location is not returned by the proposal endpoint.
export interface FellowshipApplicationProposalWriteDto {
  title?: string;
  problemStatement?: string;
  plan?: string;
  mentorName?: string;
  mentorContact?: string;
  mentorTestimonial?: string;
  github?: string;
  links?: string[];
  projectName?: string;
  projectGithubLink?: string;
  location?: string;
  academicBackground?: string;
  graduationYear?: number;
  professionalExperience?: string;
  domains?: string[];
  codingLanguages?: string[];
  educationInterests?: string[];
  bitcoinContributions?: string;
  bitcoinMotivation?: string;
  bitcoinOssGoal?: string;
  additionalInfo?: string;
  questionsForBitshala?: string;
}

export interface CreateFellowshipApplicationRequestDto
  extends FellowshipApplicationProposalWriteDto {
  type: FellowshipType;
}

export type UpdateFellowshipApplicationRequestDto = FellowshipApplicationProposalWriteDto;

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
  // The full fellowship this report belongs to — same shape as a GET /fellowships
  // list item. Never null (a report references its fellowship via a non-nullable
  // FK). `fellowshipId`/`fellowName` are kept for backward compatibility.
  fellowship: GetFellowshipResponseDto;
}

// The report body is lazy-loaded per report. All text fields round-trip as ''
// (never null) when unanswered; `links` is [] when none.
export interface GetFellowshipReportContentResponseDto {
  summary: string;
  links: string[];
  challengingWork: string;
  keyLearning: string;
  reviewerFeedback: string;
  growthGoal: string;
}

export interface CreateFellowshipReportRequestDto {
  fellowshipId: string;
  month: number;
  year: number;
  // Required key; may be empty on a draft. The four reflective fields and links
  // are optional everywhere — they never block a draft save or a submit.
  summary: string;
  links?: string[];
  challengingWork?: string;
  keyLearning?: string;
  reviewerFeedback?: string;
  growthGoal?: string;
}

// Any field omitted on PATCH is left untouched.
export interface UpdateFellowshipReportRequestDto {
  summary?: string;
  links?: string[];
  challengingWork?: string;
  keyLearning?: string;
  reviewerFeedback?: string;
  growthGoal?: string;
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
