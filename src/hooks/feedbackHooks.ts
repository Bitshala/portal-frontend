import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type {
  CreateFeedbackRequestDto,
  CreateFeedbackResponseDto,
  GetFeedbackResponseDto,
  PaginatedDataDto,
  PaginatedQueryDto,
  UpdateFeedbackRequestDto,
} from '../types/api.ts';

// ===============
// Queries
// ===============

export const useMyFeedback = createUseQuery<PaginatedDataDto<GetFeedbackResponseDto>, PaginatedQueryDto>(
  (query) => ['feedback', 'me', query],
  (query) => () => apiService.getMyFeedback(query),
);

export const useAllFeedback = createUseQuery<PaginatedDataDto<GetFeedbackResponseDto>, PaginatedQueryDto>(
  (query) => ['feedback', 'all', query],
  (query) => () => apiService.listAllFeedback(query),
);

export const useFeedbackByCohort = createUseQuery<
  PaginatedDataDto<GetFeedbackResponseDto>,
  { cohortId: string; query: PaginatedQueryDto }
>(
  ({ cohortId, query }) => ['feedback', 'cohort', cohortId, query],
  ({ cohortId, query }) => () => apiService.listFeedbackByCohort(cohortId, query),
);

// ===============
// Mutations
// ===============

export const useSubmitFeedback = createUseMutation<
  CreateFeedbackResponseDto,
  { cohortId: string; body: CreateFeedbackRequestDto }
>(({ cohortId, body }) => apiService.submitFeedback(cohortId, body));

export const useUpdateFeedback = createUseMutation<
  void,
  { id: string; body: UpdateFeedbackRequestDto }
>(({ id, body }) => apiService.updateFeedback(id, body));
