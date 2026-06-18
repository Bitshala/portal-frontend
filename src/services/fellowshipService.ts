import axios, { AxiosHeaders, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { getAuthTokenFromStorage } from './authService.ts';
import type { PaginatedDataDto } from '../types/api.ts';
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
  GithubUserCheckResponseDto,
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
import { FellowshipApplicationStatus } from '../types/fellowship.ts';
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

  // Headers for multipart/form-data uploads. We deliberately do NOT spread
  // COMMON_REQUEST_HEADERS here — its 'Content-Type: application/json' would
  // stop axios/the browser from setting the multipart boundary and the upload
  // would fail. Only the ngrok bypass + auth token carry over.
  private getMultipartRequestHeaders(): AxiosHeaders {
    const headers = new AxiosHeaders({ 'ngrok-skip-browser-warning': 'true' });
    const token = getAuthTokenFromStorage();
    if (token) headers.setAuthorization(`Bearer ${token}`);
    return headers;
  }

  // Walk every page of a paginated list endpoint and return all matching rows.
  // Used by the admin CSV exports, which must cover the full filtered result
  // set rather than just the page currently on screen.
  private async fetchAllPages<TQuery extends PaginatedQueryDto, TRecord>(
    list: (query: TQuery) => Promise<PaginatedDataDto<TRecord>>,
    query: Omit<TQuery, 'page' | 'pageSize'>,
  ): Promise<TRecord[]> {
    const PAGE_SIZE = 100; // backend hard-caps pageSize at 100
    const records: TRecord[] = [];
    let page = 0;
    // Guard against an unbounded loop if totalRecords and records ever disagree.
    for (;;) {
      const data = await list({ ...query, page, pageSize: PAGE_SIZE } as TQuery);
      records.push(...data.records);
      if (records.length >= data.totalRecords || data.records.length === 0) break;
      page += 1;
    }
    return records;
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

  public getApplicationProposal = async (id: string): Promise<FellowshipApplicationProposalDto> => {
    const { data } = await this.request<FellowshipApplicationProposalDto>({
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

  // REJECTED / CHANGES_REQUESTED only — JSON. ACCEPTED goes through
  // acceptApplication (multipart, with the signed contract PDF).
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

  // Accept an application. Multipart: the Bitshala-signed unsigned-contract PDF
  // is required. On success the backend creates the fellowship (in
  // AWAITING_DOCUMENTS) and its three document rows.
  public acceptApplication = async (id: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('status', FellowshipApplicationStatus.ACCEPTED);
    formData.append('file', file);
    await this.request<void>({
      headers: this.getMultipartRequestHeaders(),
      method: 'PATCH',
      url: `/fellowship-applications/${id}/review`,
      data: formData,
    });
  };

  // Soft check that a GitHub account exists — advisory only, never blocks.
  public checkGithubUser = async (username: string): Promise<GithubUserCheckResponseDto> => {
    const { data } = await this.request<GithubUserCheckResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowship-applications/github/${encodeURIComponent(username)}`,
    });
    return data;
  };

  // =========================
  // Fellowship Application Notes
  // =========================

  // Internal admin notes on an application. This list route returns a PLAIN
  // ARRAY (oldest-first) — there is no { records, totalRecords } wrapper here.
  public listApplicationNotes = async (
    applicationId: string,
  ): Promise<FellowshipApplicationNote[]> => {
    const { data } = await this.request<FellowshipApplicationNote[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowship-applications/${applicationId}/notes`,
    });
    return data;
  };

  public createApplicationNote = async (
    applicationId: string,
    body: FellowshipApplicationNoteWriteDto,
  ): Promise<FellowshipApplicationNote> => {
    const { data } = await this.request<FellowshipApplicationNote>({
      headers: this.getRequestHeaders(),
      method: 'POST',
      url: `/fellowship-applications/${applicationId}/notes`,
      data: body,
    });
    return data;
  };

  // Author-only on the server (403 for anyone else); 404 if the note is gone.
  public updateApplicationNote = async (
    applicationId: string,
    noteId: string,
    body: FellowshipApplicationNoteWriteDto,
  ): Promise<FellowshipApplicationNote> => {
    const { data } = await this.request<FellowshipApplicationNote>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowship-applications/${applicationId}/notes/${noteId}`,
      data: body,
    });
    return data;
  };

  // Author-only on the server (403 for anyone else); 204 No Content on success.
  public deleteApplicationNote = async (
    applicationId: string,
    noteId: string,
  ): Promise<void> => {
    await this.request<void>({
      headers: this.getRequestHeaders(),
      method: 'DELETE',
      url: `/fellowship-applications/${applicationId}/notes/${noteId}`,
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
    query: ListFellowshipsQueryDto,
  ): Promise<PaginatedDataDto<GetFellowshipResponseDto>> => {
    const { data } = await this.request<PaginatedDataDto<GetFellowshipResponseDto>>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: '/fellowships',
      params: query,
    });
    return data;
  };

  public fetchAllFellowships = (
    query: Omit<ListFellowshipsQueryDto, 'page' | 'pageSize'>,
  ): Promise<GetFellowshipResponseDto[]> =>
    this.fetchAllPages(this.listFellowships, query);

  public getFellowship = async (id: string): Promise<GetFellowshipResponseDto> => {
    const { data } = await this.request<GetFellowshipResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowships/${id}`,
    });
    return data;
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
  // Fellowship Documents
  // =========================

  public listFellowshipDocuments = async (
    fellowshipId: string,
  ): Promise<FellowshipDocumentResponseDto[]> => {
    const { data } = await this.request<FellowshipDocumentResponseDto[]>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowships/${fellowshipId}/documents`,
    });
    return data;
  };

  // Authenticated proxied download. The route is auth-gated, so this must ride
  // the Bearer token (a bare <a href> would 401) — caller turns the blob into
  // an object URL and triggers the download.
  public downloadFellowshipDocument = async (
    fellowshipId: string,
    documentId: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await this.request<Blob>({
      headers: this.getRequestHeaders(),
      method: 'GET',
      url: `/fellowships/${fellowshipId}/documents/${documentId}/download`,
      responseType: 'blob',
    });
    const disposition = (response.headers as Record<string, string>)['content-disposition'] ?? '';
    const filename = disposition.match(/filename="(.+)"/)?.[1] ?? 'document.pdf';
    return { blob: response.data, filename };
  };

  // Upload / re-upload a fellow document (SIGNED_CONTRACT, W8BEN, or any
  // re-upload after a rejection). Multipart, PDF only. Sets the document to
  // PENDING_REVIEW and returns its updated row.
  public uploadFellowshipDocument = async (
    fellowshipId: string,
    documentId: string,
    file: File,
  ): Promise<FellowshipDocumentResponseDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.request<FellowshipDocumentResponseDto>({
      headers: this.getMultipartRequestHeaders(),
      method: 'POST',
      url: `/fellowships/${fellowshipId}/documents/${documentId}`,
      data: formData,
    });
    return data;
  };

  // Admin approve / reject of a single fellow document.
  public reviewFellowshipDocument = async (
    fellowshipId: string,
    documentId: string,
    body: ReviewFellowshipDocumentRequestDto,
  ): Promise<FellowshipDocumentResponseDto> => {
    const { data } = await this.request<FellowshipDocumentResponseDto>({
      headers: this.getRequestHeaders(),
      method: 'PATCH',
      url: `/fellowships/${fellowshipId}/documents/${documentId}/review`,
      data: body,
    });
    return data;
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

  public fetchAllReports = (
    query: Omit<ListFellowshipReportsQueryDto, 'page' | 'pageSize'>,
  ): Promise<GetFellowshipReportResponseDto[]> =>
    this.fetchAllPages(this.listReports, query);

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
