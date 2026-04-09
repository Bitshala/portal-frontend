import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type { GetCertificateResponseDto, CertificatePreviewResponseDto } from '../types/api.ts';

// ===============
// Queries
// ===============

export const useMyCertificates = createUseQuery<
  GetCertificateResponseDto[],
  void
>(
  () => ['certificates', 'me'],
  () => apiService.getMyCertificates,
);

export const useMyCertificateForCohort = createUseQuery<
  GetCertificateResponseDto,
  string
>(
  (cohortId) => ['certificates', 'cohort', cohortId, 'me'],
  (cohortId) => () => apiService.getMyCertificateForCohort(cohortId),
);

export const useCohortCertificates = createUseQuery<
  GetCertificateResponseDto[],
  string
>(
  (cohortId) => ['certificates', 'cohort', cohortId],
  (cohortId) => () => apiService.getCohortCertificates(cohortId),
);

export const usePreviewCohortCertificates = createUseQuery<
  CertificatePreviewResponseDto[],
  string
>(
  (cohortId) => ['certificates', 'cohort', cohortId, 'preview'],
  (cohortId) => () => apiService.previewCohortCertificates(cohortId),
);

// ===============
// Mutations
// ===============

export const useGenerateCohortCertificates = createUseMutation<
  void,
  { cohortId: string }
>(
  ({ cohortId }) => apiService.generateCohortCertificates(cohortId),
  {
    queryInvalidation: async ({ variables: { cohortId }, queryClient }) => {
      await useCohortCertificates.invalidate(cohortId);
      await queryClient.invalidateQueries({ queryKey: ['certificates', 'me'] });
    },
  },
);

export const useSendCohortCertificateEmails = createUseMutation<void, { cohortId: string }>(
  ({ cohortId }) => apiService.sendCohortCertificateEmails(cohortId),
);

export const useDownloadCertificate = createUseMutation<Blob, { id: string }>(
  ({ id }) => apiService.downloadCertificate(id),
);
