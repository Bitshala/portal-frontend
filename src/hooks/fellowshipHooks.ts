import { createUseMutation, createUseQuery } from '../http';
import fellowshipService from '../services/fellowshipService.ts';
import type { PaginatedDataDto, PaginatedQueryDto } from '../types/api.ts';
import type {
  CreateFellowshipApplicationRequestDto,
  CreateFellowshipReportRequestDto,
  GetFellowshipApplicationProposalResponseDto,
  GetFellowshipApplicationResponseDto,
  GetFellowshipReportContentResponseDto,
  GetFellowshipReportResponseDto,
  GetFellowshipResponseDto,
  ListFellowshipApplicationsQueryDto,
  ListFellowshipReportsQueryDto,
  ReviewFellowshipApplicationRequestDto,
  ReviewFellowshipReportRequestDto,
  StartFellowshipContractRequestDto,
  UpdateFellowshipApplicationRequestDto,
  UpdateFellowshipOnboardingRequestDto,
  UpdateFellowshipReportRequestDto,
} from '../types/fellowship.ts';

// =========================
// Fellowship Applications — Queries
// =========================

export const useMyApplications = createUseQuery<
  PaginatedDataDto<GetFellowshipApplicationResponseDto>,
  PaginatedQueryDto
>(
  (query) => ['fellowship-applications', 'me', query],
  (query) => () => fellowshipService.listMyApplications(query),
);

export const useApplications = createUseQuery<
  PaginatedDataDto<GetFellowshipApplicationResponseDto>,
  ListFellowshipApplicationsQueryDto
>(
  (query) => ['fellowship-applications', 'list', query],
  (query) => () => fellowshipService.listApplications(query),
);

export const useApplication = createUseQuery<GetFellowshipApplicationResponseDto, string>(
  (id) => ['fellowship-applications', 'one', id],
  (id) => () => fellowshipService.getApplication(id),
);

export const useApplicationProposal = createUseQuery<
  GetFellowshipApplicationProposalResponseDto,
  string
>(
  (id) => ['fellowship-applications', 'proposal', id],
  (id) => () => fellowshipService.getApplicationProposal(id),
);

// =========================
// Fellowship Applications — Mutations
// =========================

export const useCreateApplication = createUseMutation<
  GetFellowshipApplicationResponseDto,
  CreateFellowshipApplicationRequestDto
>(
  (body) => fellowshipService.createApplication(body),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications'] });
    },
  },
);

export const useUpdateApplication = createUseMutation<
  void,
  { id: string; body: UpdateFellowshipApplicationRequestDto }
>(
  ({ id, body }) => fellowshipService.updateApplication(id, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications', 'proposal', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications', 'one', variables.id] });
    },
  },
);

export const useSubmitApplication = createUseMutation<void, { id: string }>(
  ({ id }) => fellowshipService.submitApplication(id),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications'] });
    },
  },
);

export const useDeleteApplication = createUseMutation<void, { id: string }>(
  ({ id }) => fellowshipService.deleteApplication(id),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications'] });
    },
  },
);

export const useReviewApplication = createUseMutation<
  void,
  { id: string; body: ReviewFellowshipApplicationRequestDto }
>(
  ({ id, body }) => fellowshipService.reviewApplication(id, body),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['fellowships'] });
    },
  },
);

// =========================
// Fellowships — Queries
// =========================

export const useMyFellowships = createUseQuery<
  PaginatedDataDto<GetFellowshipResponseDto>,
  PaginatedQueryDto
>(
  (query) => ['fellowships', 'me', query],
  (query) => () => fellowshipService.listMyFellowships(query),
);

export const useFellowships = createUseQuery<
  PaginatedDataDto<GetFellowshipResponseDto>,
  PaginatedQueryDto
>(
  (query) => ['fellowships', 'list', query],
  (query) => () => fellowshipService.listFellowships(query),
);

export const useFellowship = createUseQuery<GetFellowshipResponseDto, string>(
  (id) => ['fellowships', 'one', id],
  (id) => () => fellowshipService.getFellowship(id),
);

// =========================
// Fellowships — Mutations
// =========================

export const useUpdateFellowshipOnboarding = createUseMutation<
  void,
  { id: string; body: UpdateFellowshipOnboardingRequestDto }
>(
  ({ id, body }) => fellowshipService.updateFellowshipOnboarding(id, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowships', 'one', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['fellowships'] });
    },
  },
);

export const useStartFellowshipContract = createUseMutation<
  void,
  { id: string; body: StartFellowshipContractRequestDto }
>(
  ({ id, body }) => fellowshipService.startFellowshipContract(id, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowships', 'one', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['fellowships'] });
    },
  },
);

// =========================
// Fellowship Reports — Queries
// =========================

export const useMyReports = createUseQuery<
  PaginatedDataDto<GetFellowshipReportResponseDto>,
  PaginatedQueryDto
>(
  (query) => ['fellowship-reports', 'me', query],
  (query) => () => fellowshipService.listMyReports(query),
);

export const useReports = createUseQuery<
  PaginatedDataDto<GetFellowshipReportResponseDto>,
  ListFellowshipReportsQueryDto
>(
  (query) => ['fellowship-reports', 'list', query],
  (query) => () => fellowshipService.listReports(query),
);

export const useReport = createUseQuery<GetFellowshipReportResponseDto, string>(
  (id) => ['fellowship-reports', 'one', id],
  (id) => () => fellowshipService.getReport(id),
);

export const useReportContent = createUseQuery<
  GetFellowshipReportContentResponseDto,
  string
>(
  (id) => ['fellowship-reports', 'content', id],
  (id) => () => fellowshipService.getReportContent(id),
);

// =========================
// Fellowship Reports — Mutations
// =========================

export const useCreateReport = createUseMutation<
  GetFellowshipReportResponseDto,
  CreateFellowshipReportRequestDto
>(
  (body) => fellowshipService.createReport(body),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-reports'] });
    },
  },
);

export const useUpdateReport = createUseMutation<
  void,
  { id: string; body: UpdateFellowshipReportRequestDto }
>(
  ({ id, body }) => fellowshipService.updateReport(id, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-reports', 'content', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['fellowship-reports', 'one', variables.id] });
    },
  },
);

export const useSubmitReport = createUseMutation<void, { id: string }>(
  ({ id }) => fellowshipService.submitReport(id),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-reports'] });
    },
  },
);

export const useDeleteReport = createUseMutation<void, { id: string }>(
  ({ id }) => fellowshipService.deleteReport(id),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-reports'] });
    },
  },
);

export const useReviewReport = createUseMutation<
  void,
  { id: string; body: ReviewFellowshipReportRequestDto }
>(
  ({ id, body }) => fellowshipService.reviewReport(id, body),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-reports'] });
    },
  },
);
