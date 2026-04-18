import axios, { AxiosHeaders, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getAuthTokenFromStorage } from './authService.ts';
import type { PaginatedDataDto } from '../types/api.ts';
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
import type { PaginatedQueryDto } from '../types/api.ts';

const COMMON_REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class FellowshipService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.request<T>(config);
  }

  private getRequestHeaders(): AxiosHeaders {
    const headers = new AxiosHeaders(COMMON_REQUEST_HEADERS);
    const token = getAuthTokenFromStorage();
    if (token) headers.setAuthorization(`Bearer ${token}`);
    return headers;
  }

  // =========================
  // Fellowship Applications
  // =========================

  public listMyApplications = async (
    query: PaginatedQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipApplicationResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipApplicationResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowship-applications/me',
      params: query,
    });
    return data;
  };

  public listApplications = async (
    query: ListFellowshipApplicationsQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipApplicationResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipApplicationResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowship-applications',
      params: query,
    });
    return data;
  };

  public getApplication = async (id: string): Promise<GetFellowshipApplicationResponseDto> => {
    const { data } = await this.request<GetFellowshipApplicationResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowship-applications/${id}`,
    });
    return data;
  };

  public getApplicationProposal = async (id: string): Promise<GetFellowshipApplicationProposalResponseDto> => {
    const { data } = await this.request<GetFellowshipApplicationProposalResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowship-applications/${id}/proposal`,
    });
    return data;
  };

  public createApplication = async (
    body: CreateFellowshipApplicationRequestDto,
  ): Promise<GetFellowshipApplicationResponseDto> => {
    const { data } = await this.request<GetFellowshipApplicationResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: '/fellowship-applications',
      data: body,
    });
    return data;
  };

  public updateApplication = async (
    id: string,
    body: UpdateFellowshipApplicationRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowship-applications/${id}`,
      data: body,
    });
  };

  public submitApplication = async (id: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/fellowship-applications/${id}/submit`,
    });
  };

  public deleteApplication = async (id: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'DELETE',
      url: `/fellowship-applications/${id}`,
    });
  };

  public reviewApplication = async (
    id: string,
    body: ReviewFellowshipApplicationRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowship-applications/${id}/review`,
      data: body,
    });
  };

  // =========================
  // Fellowships
  // =========================

  public listMyFellowships = async (
    query: PaginatedQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowships/me',
      params: query,
    });
    return data;
  };

  public listFellowships = async (
    query: PaginatedQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowships',
      params: query,
    });
    return data;
  };

  public getFellowship = async (id: string): Promise<GetFellowshipResponseDto> => {
    const { data } = await this.request<GetFellowshipResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowships/${id}`,
    });
    return data;
  };

  public updateFellowshipOnboarding = async (
    id: string,
    body: UpdateFellowshipOnboardingRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowships/${id}/onboarding`,
      data: body,
    });
  };

  public startFellowshipContract = async (
    id: string,
    body: StartFellowshipContractRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowships/${id}/start-contract`,
      data: body,
    });
  };

  // =========================
  // Fellowship Reports
  // =========================

  public listMyReports = async (
    query: PaginatedQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipReportResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipReportResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowship-reports/me',
      params: query,
    });
    return data;
  };

  public listReports = async (
    query: ListFellowshipReportsQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipReportResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipReportResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowship-reports',
      params: query,
    });
    return data;
  };

  public getReport = async (id: string): Promise<GetFellowshipReportResponseDto> => {
    const { data } = await this.request<GetFellowshipReportResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowship-reports/${id}`,
    });
    return data;
  };

  public getReportContent = async (id: string): Promise<GetFellowshipReportContentResponseDto> => {
    const { data } = await this.request<GetFellowshipReportContentResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowship-reports/${id}/content`,
    });
    return data;
  };

  public createReport = async (
    body: CreateFellowshipReportRequestDto,
  ): Promise<GetFellowshipReportResponseDto> => {
    const { data } = await this.request<GetFellowshipReportResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: '/fellowship-reports',
      data: body,
    });
    return data;
  };

  public updateReport = async (
    id: string,
    body: UpdateFellowshipReportRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowship-reports/${id}`,
      data: body,
    });
  };

  public submitReport = async (id: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/fellowship-reports/${id}/submit`,
    });
  };

  public deleteReport = async (id: string): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'DELETE',
      url: `/fellowship-reports/${id}`,
    });
  };

  public reviewReport = async (
    id: string,
    body: ReviewFellowshipReportRequestDto,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowship-reports/${id}/review`,
      data: body,
    });
  };
}

const fellowshipService = new FellowshipService();

export default fellowshipService;
