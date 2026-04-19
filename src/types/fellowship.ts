import type { PaginatedQueryDto } from './api.ts';

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
  userId: string;
  userName: string | null;
  userEmail: string | null;
  type: FellowshipType;
  status: FellowshipApplicationStatus;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewerRemarks: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
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
  status: FellowshipApplicationStatus.ACCEPTED | FellowshipApplicationStatus.REJECTED;
  reviewerRemarks?: string;
}

export interface ListFellowshipApplicationsQueryDto extends PaginatedQueryDto {
  status?: FellowshipApplicationStatus;
  type?: FellowshipType;
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
  type: FellowshipType;
  status: FellowshipStatus;
  startDate: string | null;
  endDate: string | null;
  amountUsd: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UpdateFellowshipOnboardingRequestDto = Partial<FellowshipOnboardingDto>;

export interface StartFellowshipContractRequestDto {
  startDate: string;
  endDate: string;
  amountUsd: string;
}

// =========================
// Fellowship Reports
// =========================

export interface GetFellowshipReportResponseDto {
  id: string;
  fellowshipId: string;
  userId: string;
  userName: string | null;
  month: number;
  year: number;
  status: FellowshipReportStatus;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewerRemarks: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
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

export interface ListFellowshipReportsQueryDto extends PaginatedQueryDto {
  status?: FellowshipReportStatus;
  month?: number;
  year?: number;
}
