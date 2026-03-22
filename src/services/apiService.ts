import axios, { AxiosHeaders, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getAuthTokenFromStorage } from './authService.ts';
import type {
  // Users
  GetUserResponse,
  UpdateUserRequest,
  UpdateUserRoleRequest,
  // Cohorts
  PaginatedDataDto,
  PaginatedQueryDto,
  GetCohortResponseDto,
  CreateCohortRequestDto,
  UpdateCohortRequestDto,
  UpdateCohortWeekRequestDto,
  JoinWaitlistRequestDto,
  UserCohortWaitlistResponseDto,
  // Scores
  GetUsersScoresResponseDto,
  ListScoresForCohortAndWeekResponseDto,
  UpdateScoresRequestDto,
  GetCohortLeaderboardResponseDto,
  // Teaching Assistants
  GetTeachingAssistantResponseDto,
  // Certificates
  GetCertificateResponseDto,
  // Feedback
  CreateFeedbackRequestDto,
  CreateFeedbackResponseDto,
  GetFeedbackResponseDto,
  UpdateFeedbackRequestDto,
} from '../types/api.ts';

const COMMON_REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.request<T>(config);
  }

  private getRequestHeaders(): AxiosHeaders {
    const headers = new AxiosHeaders(COMMON_REQUEST_HEADERS);
    const authToken = getAuthTokenFromStorage();
    if (authToken) {
      headers.setAuthorization(`Bearer ${authToken}`);
    }
    return headers;
  }

  private getUnauthenticatedRequestHeaders(): AxiosHeaders {
    return new AxiosHeaders(COMMON_REQUEST_HEADERS);
  }

  // =========================
  // Users
  // =========================

  public getUser = async (): Promise<GetUserResponse> => {
    const { data } = await this.request<GetUserResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/users/me',
    });
    return data;
  };

  public updateUser = async (body: UpdateUserRequest): Promise<GetUserResponse> => {
    const { data } = await this.request<GetUserResponse>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: '/users/me',
      data: body,
    });
    return data;
  };

  public updateUserRole = async (body: UpdateUserRoleRequest): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: '/users/role',
      data: body,
    });
  };

  public getUserById = async (id: string): Promise<GetUserResponse> => {
    const { data } = await this.request<GetUserResponse>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/users/${id}`,
    });
    return data;
  };

  // =========================
  // Cohorts
  // =========================

  public listCohorts = async (
    query: PaginatedQueryDto,
  ): Promise<PaginatedDataDto<GetCohortResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetCohortResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/cohorts',
      params: query,
    });
    return data;
  };

  public listMyCohorts = async (
    query: PaginatedQueryDto,
  ): Promise<PaginatedDataDto<GetCohortResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetCohortResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/cohorts/me',
      params: query,
    });
    return data;
  };

  public getCohort = async (id: string): Promise<GetCohortResponseDto> => {
    const { data } = await this.request<GetCohortResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/cohorts/${id}`,
    });
    return data;
  };

  public createCohort = async (body: CreateCohortRequestDto): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: '/cohorts',
      data: body,
    });
  };

  public updateCohort = async (
    cohortId: string,
    body: UpdateCohortRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/cohorts/${cohortId}`,
      data: body,
    });
  };

  public updateCohortWeek = async (
    cohortWeekId: string,
    body: UpdateCohortWeekRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/cohorts/weeks/${cohortWeekId}`,
      data: body,
    });
  };

  public joinCohort = async (cohortId: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/cohorts/${cohortId}/join`,
    });
  };

  public joinCohortWaitlist = async (body: JoinWaitlistRequestDto): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: '/cohorts/waitlist',
      data: body,
    });
  };

  public getUserWaitlistStatus = async (): Promise<UserCohortWaitlistResponseDto> => {
    const { data } = await this.request<UserCohortWaitlistResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/cohorts/waitlist/me',
    });
    return data;
  };

  public removeUserFromCohort = async (
    cohortId: string,
    userId: string,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/cohorts/${cohortId}/remove/${userId}`,
    });
  };

  // =========================
  // Scores
  // =========================

  public listScoresForCohortAndWeek = async (
    cohortId: string,
    weekId: string,
  ): Promise<ListScoresForCohortAndWeekResponseDto> => {
    const { data } = await this.request<ListScoresForCohortAndWeekResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/scores/cohort/${cohortId}/week/${weekId}`,
    });
    return data;
  };

  public updateScoresForUserCohortAndWeek = async (
    userId: string,
    cohortId: string,
    weekId: string,
    body: UpdateScoresRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/scores/user/${userId}/cohort/${cohortId}/week/${weekId}`,
      data: body,
    });
    return;
  };

  public getMyScores = async (): Promise<GetUsersScoresResponseDto> => {
    const { data } = await this.request<GetUsersScoresResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/scores/me',
    });
    return data;
  };

  public getUserScores = async (userId: string): Promise<GetUsersScoresResponseDto> => {
    const { data } = await this.request<GetUsersScoresResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/scores/user/${userId}`,
    });
    return data;
  };

  public assignGroupsForCohortWeek = async (weekId: string, body: { participantsPerWeek: number; groupsAvailable: number }): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/scores/week/${weekId}/assign-groups`,
      data: body,
    });
  };

  public assignTAToGroup = async (weekId: string, groupNumber: number, userId: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/scores/week/${weekId}/assign-ta-to-group`,
      data: { userId, groupNumber },
    });
  };

  public getCohortLeaderboard = async (cohortId: string): Promise<GetCohortLeaderboardResponseDto> => {
    const { data } = await this.request<GetCohortLeaderboardResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/scores/cohort/${cohortId}/leaderboard`,
    });
    return data;
  };

  // =========================
  // Feedback
  // =========================

  public submitFeedback = async (cohortId: string, body: CreateFeedbackRequestDto): Promise<CreateFeedbackResponseDto> => {
    const { data } = await this.request<CreateFeedbackResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/feedback/${cohortId}`,
      data: body,
    });
    return data;
  };

  public getMyFeedback = async (query: PaginatedQueryDto): Promise<PaginatedDataDto<GetFeedbackResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFeedbackResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/feedback/me',
      params: query,
    });
    return data;
  };

  public updateFeedback = async (id: string, body: UpdateFeedbackRequestDto): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/feedback/${id}`,
      data: body,
    });
  };

  public listAllFeedback = async (query: PaginatedQueryDto): Promise<PaginatedDataDto<GetFeedbackResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFeedbackResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/feedback',
      params: query,
    });
    return data;
  };

  public listFeedbackByCohort = async (cohortId: string, query: PaginatedQueryDto): Promise<PaginatedDataDto<GetFeedbackResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFeedbackResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/feedback/cohort/${cohortId}`,
      params: query,
    });
    return data;
  };

  public getFeedbackById = async (id: string): Promise<GetFeedbackResponseDto> => {
    const { data } = await this.request<GetFeedbackResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/feedback/${id}`,
    });
    return data;
  };

  // =========================
  // Teaching Assistants
  // =========================

  public listTeachingAssistants = async (): Promise<GetTeachingAssistantResponseDto[]> => {
    const { data } = await this.request<GetTeachingAssistantResponseDto[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/teaching-assistants',
    });
    return data;
  };

  public getTeachingAssistant = async (id: string): Promise<GetTeachingAssistantResponseDto> => {
    const { data } = await this.request<GetTeachingAssistantResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/teaching-assistants/${id}`,
    });
    return data;
  };
  // =========================
  // Certificates
  // =========================

  public generateCohortCertificates = async (cohortId: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/certificates/cohort/${cohortId}/generate`,
    });
  };

  public getMyCertificateForCohort = async (cohortId: string): Promise<GetCertificateResponseDto> => {
    const { data } = await this.request<GetCertificateResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/certificates/cohort/${cohortId}/me`,
    });
    return data;
  };

  public getMyCertificates = async (): Promise<GetCertificateResponseDto[]> => {
    const { data } = await this.request<GetCertificateResponseDto[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/certificates/me',
    });
    return data;
  };

  public getCohortCertificates = async (cohortId: string): Promise<GetCertificateResponseDto[]> => {
    const { data } = await this.request<GetCertificateResponseDto[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/certificates/cohort/${cohortId}`,
    });
    return data;
  };

  public downloadCertificate = async (id: string): Promise<Blob> => {
    const { data } = await this.request<Blob>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/certificates/${id}/download`,
      responseType: 'blob',
    });
    return data;
  };
}

const serviceInstance = new ApiService();

export default serviceInstance;
