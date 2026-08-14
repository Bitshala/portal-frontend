import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type { GetUserResponse, PaginatedDataDto, UpdateUserRequest, UpdateUserRoleRequest } from '../types/api.ts';
import type {
  GetUserOverviewResponseDto,
  ListUsersQueryDto,
  UserSearchResultDto,
} from '../types/userOverview.ts';

// ===============
// Queries
// ===============

export const useUser = createUseQuery<GetUserResponse, void>(
  () => ['user'],
  () => apiService.getUser
);

export const useUserById = createUseQuery<GetUserResponse, string>(
  (id) => ['user', id],
  (id) => () => apiService.getUserById(id)
);

// Admin user search (paginated). Keyed by the full query so paging/sort/search
// each get their own cache entry.
export const useUsers = createUseQuery<PaginatedDataDto<UserSearchResultDto>, ListUsersQueryDto>(
  (query) => ['users', 'list', query],
  (query) => () => apiService.searchUsers(query)
);

export const useUserOverview = createUseQuery<GetUserOverviewResponseDto, string>(
  (id) => ['user', 'overview', id],
  (id) => () => apiService.getUserOverview(id)
);

// ===============
// Mutations
// ===============

export const useUpdateUser = createUseMutation<
  GetUserResponse,
  UpdateUserRequest
>(apiService.updateUser, {
  queryInvalidation: async () => {
    await useUser.invalidate();
  },
});

export const useUpdateUserRole = createUseMutation<void, UpdateUserRoleRequest>(
  apiService.updateUserRole,
);