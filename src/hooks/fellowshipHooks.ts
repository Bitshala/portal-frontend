import { createUseMutation, createUseQuery } from '../http';
import fellowshipService from '../services/fellowshipService.ts';
import type { PaginatedDataDto, PaginatedQueryDto } from '../types/api.ts';
import type {
  CreateFellowshipApplicationRequestDto,
  CreateFellowshipReportRequestDto,
  FellowshipApplicationNote,
  FellowshipApplicationNoteWriteDto,
  FellowshipApplicationProposalDto,
  FellowshipDocumentResponseDto,
  GetFellowshipApplicationResponseDto,
  GetFellowshipReportContentResponseDto,
  GetFellowshipReportResponseDto,
  GetFellowshipResponseDto,
  ListFellowshipApplicationsQueryDto,
  ListFellowshipReportsQueryDto,
  ListFellowshipsQueryDto,
  ReviewFellowshipApplicationRequestDto,
  ReviewFellowshipDocumentRequestDto,
  ReviewFellowshipReportRequestDto,
  StartFellowshipContractRequestDto,
  UpdateFellowshipApplicationRequestDto,
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
  FellowshipApplicationProposalDto,
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
      // Refresh only the application lists. A broad ['fellowship-applications']
      // invalidation also matches the proposal queries, refetching the
      // just-deleted application's proposal (still mounted for a tick) → 404.
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications', 'me'] });
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications', 'list'] });
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

// Accept = multipart with the signed contract PDF. Creates the fellowship, so
// invalidate both the application lists and the fellowship lists.
export const useAcceptApplication = createUseMutation<
  void,
  { id: string; file: File }
>(
  ({ id, file }) => fellowshipService.acceptApplication(id, file),
  {
    queryInvalidation: async ({ queryClient }) => {
      await queryClient.invalidateQueries({ queryKey: ['fellowship-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['fellowships'] });
    },
  },
);

// =========================
// Fellowship Application Notes
// =========================

// The list route returns a plain array ordered oldest-first, so the query data
// is FellowshipApplicationNote[] — not a PaginatedDataDto.
export const useApplicationNotes = createUseQuery<
  FellowshipApplicationNote[],
  string
>(
  (applicationId) => ['fellowship-application-notes', applicationId],
  (applicationId) => () => fellowshipService.listApplicationNotes(applicationId),
);

export const useCreateApplicationNote = createUseMutation<
  FellowshipApplicationNote,
  { applicationId: string; body: FellowshipApplicationNoteWriteDto }
>(
  ({ applicationId, body }) => fellowshipService.createApplicationNote(applicationId, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({
        queryKey: ['fellowship-application-notes', variables.applicationId],
      });
    },
  },
);

export const useUpdateApplicationNote = createUseMutation<
  FellowshipApplicationNote,
  { applicationId: string; noteId: string; body: FellowshipApplicationNoteWriteDto }
>(
  ({ applicationId, noteId, body }) =>
    fellowshipService.updateApplicationNote(applicationId, noteId, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({
        queryKey: ['fellowship-application-notes', variables.applicationId],
      });
    },
  },
);

export const useDeleteApplicationNote = createUseMutation<
  void,
  { applicationId: string; noteId: string }
>(
  ({ applicationId, noteId }) => fellowshipService.deleteApplicationNote(applicationId, noteId),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      await queryClient.invalidateQueries({
        queryKey: ['fellowship-application-notes', variables.applicationId],
      });
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
  ListFellowshipsQueryDto
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
// Fellowship Documents — Queries
// =========================

export const useFellowshipDocuments = createUseQuery<
  FellowshipDocumentResponseDto[],
  string
>(
  (fellowshipId) => ['fellowship-documents', fellowshipId],
  (fellowshipId) => () => fellowshipService.listFellowshipDocuments(fellowshipId),
);

// =========================
// Fellowship Documents — Mutations
// =========================

export const useUploadFellowshipDocument = createUseMutation<
  FellowshipDocumentResponseDto,
  { fellowshipId: string; documentId: string; file: File }
>(
  ({ fellowshipId, documentId, file }) =>
    fellowshipService.uploadFellowshipDocument(fellowshipId, documentId, file),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      // The doc list changes, and uploading the last outstanding fellow doc
      // advances the fellowship to DOCUMENTS_IN_REVIEW.
      await queryClient.invalidateQueries({ queryKey: ['fellowship-documents', variables.fellowshipId] });
      await queryClient.invalidateQueries({ queryKey: ['fellowships'] });
    },
  },
);

export const useReviewFellowshipDocument = createUseMutation<
  FellowshipDocumentResponseDto,
  { fellowshipId: string; documentId: string; body: ReviewFellowshipDocumentRequestDto }
>(
  ({ fellowshipId, documentId, body }) =>
    fellowshipService.reviewFellowshipDocument(fellowshipId, documentId, body),
  {
    queryInvalidation: async ({ queryClient, variables }) => {
      // Reject returns the fellowship to AWAITING_DOCUMENTS; approving the last
      // outstanding doc advances it to DOCUMENTS_APPROVED.
      await queryClient.invalidateQueries({ queryKey: ['fellowship-documents', variables.fellowshipId] });
      await queryClient.invalidateQueries({ queryKey: ['fellowships'] });
    },
  },
);

// One-shot authenticated blob fetch (no cache), modeled as a mutation like the
// certificate download. The caller turns { blob, filename } into an object URL.
export const useDownloadFellowshipDocument = createUseMutation<
  { blob: Blob; filename: string },
  { fellowshipId: string; documentId: string }
>(
  ({ fellowshipId, documentId }) =>
    fellowshipService.downloadFellowshipDocument(fellowshipId, documentId),
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
