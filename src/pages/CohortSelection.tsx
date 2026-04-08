import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Settings,
  Download,
  Plus,
  X,
  Pencil,
  FolderArchive,
  Eye,
  Trophy,
  CheckCircle2,
  Minus,
} from 'lucide-react';
import { Tooltip } from '@mui/material';
import { useCohorts, useCreateCohort, useUpdateCohort } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { useGenerateCohortCertificates, useCohortCertificates, usePreviewCohortCertificates } from '../hooks/certificateHooks';
import type { CertificatePreviewResponseDto } from '../types/api';
import apiService from '../services/apiService';
import { UserRole, CohortType } from '../types/enums';
import type { GetCohortResponseDto } from '../types/api';
import type { ApiCohort, CohortStatus } from '../types/cohort';
import Tabs from '../components/ui/Tabs';
import CohortTable from '../components/ui/CohortTable';
import type { CohortRow } from '../components/ui/CohortTable';
import { cohortTypeToName } from '../helpers/cohortHelpers';
import { computeStatus, COHORT_TYPES } from '../utils/cohortUtils';
import { getTodayDate, calculateRegistrationDeadline, formatDateForInput } from '../utils/dateUtils';
import { downloadCSV } from '../utils/csvUtils';

const BulkDownloadCertButton = ({ cohortId, onError }: { cohortId: string; onError: (msg: string) => void }) => {
  const { data: certs, isLoading } = useCohortCertificates(cohortId);
  const [downloading, setDownloading] = useState(false);

  if (isLoading || !certs || certs.length === 0) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      const { blob, filename } = await apiService.downloadBulkCertificates(cohortId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = 'Failed to download certificates.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const re = err as { response?: { data?: { message?: string } } };
        if (re.response?.data?.message) msg = re.response.data.message;
      }
      onError(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Tooltip title="Bulk download certificates" placement="top">
      <span>
        <IconButton
          size="small"
          disabled={downloading}
          onClick={handleClick}
          sx={{
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 1,
            p: 0.75,
            color: '#fbbf24',
            '&:hover': { borderColor: '#fbbf24', bgcolor: 'rgba(251,191,36,0.08)' },
            '&.Mui-disabled': { opacity: 0.4 },
          }}
        >
          {downloading
            ? <CircularProgress size={14} sx={{ color: '#fbbf24' }} />
            : <FolderArchive size={14} />
          }
        </IconButton>
      </span>
    </Tooltip>
  );
};

const rankColors: Record<1 | 2 | 3, { color: string; bg: string; label: string }> = {
  1: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: '1st' },
  2: { color: '#d4d4d8', bg: 'rgba(212,212,216,0.12)', label: '2nd' },
  3: { color: '#cd7f32', bg: 'rgba(205,127,50,0.15)', label: '3rd' },
};

const CertificatePreviewModal = ({
  cohortId,
  cohortName,
  onClose,
  onGenerate,
  isGenerating,
}: {
  cohortId: string;
  cohortName: string;
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) => {
  const { data: previews, isLoading } = usePreviewCohortCertificates(cohortId);

  const performers = previews?.filter((p) => p.certificateType === 'PERFORMER') ?? [];
  const participants = previews?.filter((p) => p.certificateType === 'PARTICIPANT') ?? [];

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: { sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.8)' } },
      }}
      PaperProps={{
        sx: {
          bgcolor: '#0e0e10',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid rgba(245,158,11,0.2)',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ pb: 0, pt: 3, px: 3, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
              <Typography sx={{ color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Certificate Preview
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1.1rem', lineHeight: 1.3 }}>
              {cohortName}
            </Typography>
            <Typography variant="caption" sx={{ color: '#52525b', mt: 0.25, display: 'block' }}>
              Dry-run only — no certificates will be generated or sent
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: '#52525b', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.06)' }, mt: -0.5 }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 0, pt: 2.5, overflowY: 'auto', flexGrow: 1 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: '#f59e0b' }} />
          </Box>
        ) : !previews || previews.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ color: '#52525b', fontSize: '0.9rem' }}>
              No certificates would be generated. Check attendance thresholds.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Stat cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
              {[
                { label: 'Total Recipients', value: previews.length, color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
                { label: 'Performers', value: performers.length, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                { label: 'Participants', value: participants.length, color: '#a1a1aa', bg: 'rgba(161,161,170,0.08)', border: 'rgba(161,161,170,0.2)' },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    bgcolor: stat.bg,
                    border: `1px solid ${stat.border}`,
                    borderRadius: 2,
                    p: 1.5,
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: stat.color, lineHeight: 1.1 }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: '#71717a', mt: 0.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Table header */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 72px 72px',
                gap: 1,
                px: 1.5,
                py: 1,
                bgcolor: 'rgba(255,255,255,0.03)',
                borderRadius: '8px 8px 0 0',
                border: '1px solid #1f1f22',
                borderBottom: 'none',
              }}
            >
              {['Name', 'Type', 'Rank', 'Exercises'].map((col) => (
                <Typography key={col} sx={{ fontSize: '0.67rem', fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {col}
                </Typography>
              ))}
            </Box>

            {/* Table rows */}
            <Box sx={{ border: '1px solid #1f1f22', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
              {previews.map((p: CertificatePreviewResponseDto, i: number) => {
                const isPerformer = p.certificateType === 'PERFORMER';
                return (
                  <Box
                    key={p.userId}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 72px 72px',
                      gap: 1,
                      px: 1.5,
                      py: 1.25,
                      alignItems: 'center',
                      bgcolor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      borderTop: i === 0 ? 'none' : '1px solid #18181b',
                      transition: 'background 0.15s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                    }}
                  >
                    {/* Name */}
                    <Typography sx={{ fontSize: '0.85rem', color: '#e4e4e7', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </Typography>

                    {/* Type badge */}
                    <Box>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1,
                          py: 0.3,
                          borderRadius: 1,
                          bgcolor: isPerformer ? 'rgba(245,158,11,0.12)' : 'rgba(161,161,170,0.1)',
                          border: `1px solid ${isPerformer ? 'rgba(245,158,11,0.3)' : 'rgba(161,161,170,0.25)'}`,
                        }}
                      >
                        {isPerformer && <Trophy size={10} color="#f59e0b" />}
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: isPerformer ? '#f59e0b' : '#a1a1aa', lineHeight: 1 }}>
                          {isPerformer ? 'Performer' : 'Participant'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Rank */}
                    <Box>
                      {p.rank ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 22,
                            borderRadius: 0.75,
                            bgcolor: rankColors[p.rank].bg,
                            border: `1px solid ${rankColors[p.rank].color}40`,
                          }}
                        >
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: rankColors[p.rank].color }}>
                            {rankColors[p.rank].label}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: '0.8rem', color: '#3f3f46' }}>—</Typography>
                      )}
                    </Box>

                    {/* Exercises */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {p.withExercises ? (
                        <CheckCircle2 size={15} color="#4ade80" />
                      ) : (
                        <Minus size={15} color="#3f3f46" />
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, flexShrink: 0 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: '#d4d4d8',
            borderColor: '#3f3f46',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
          }}
        >
          Close
        </Button>
        <Button
          onClick={() => { onGenerate(); onClose(); }}
          variant="contained"
          disabled={isGenerating || isLoading || !previews || previews.length === 0}
          startIcon={isGenerating ? <CircularProgress size={13} sx={{ color: '#000' }} /> : undefined}
          sx={{
            bgcolor: '#f59e0b',
            color: '#000',
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#d97706', boxShadow: 'none' },
            '&.Mui-disabled': { bgcolor: '#78350f', color: '#92400e' },
          }}
        >
          Generate Certificates
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#18181b',
    color: '#fafafa',
    '& fieldset': { borderColor: '#52525b' },
    '&:hover fieldset': { borderColor: '#f97316' },
    '&.Mui-focused fieldset': { borderColor: '#f97316' },
    '&.Mui-disabled': { bgcolor: '#18181b' },
    '&.Mui-disabled fieldset': { borderColor: '#3f3f46' },
  },
  '& .MuiInputLabel-root': { color: '#d4d4d8' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
  '& .MuiInputLabel-root.Mui-disabled': { color: '#a1a1aa' },
  '& .MuiInputBase-input': { color: '#fafafa' },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#a1a1aa' },
  '& .MuiSelect-icon': { color: '#d4d4d8' },
};

export const CohortSelection = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useCohorts({ page: 0, pageSize: 100 });
  const { data: user } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHING_ASSISTANT;

  const createCohortMutation = useCreateCohort();
  const updateCohortMutation = useUpdateCohort();
  const { mutate: generateCertificates, isPending: isGeneratingCerts } = useGenerateCohortCertificates();

  const [activeTab, setActiveTab] = useState<string>('Active');
  const [generatingCohortId, setGeneratingCohortId] = useState<string | null>(null);
  const [previewCohort, setPreviewCohort] = useState<{ id: string; name: string } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<GetCohortResponseDto | null>(null);
  const [selectedCohortType, setSelectedCohortType] = useState<CohortType | null>(null);

  // Form state
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formRegDeadline, setFormRegDeadline] = useState<string>('');


  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Auto-calculate registration deadline in create mode
  useEffect(() => {
    if (formStartDate && !isEditMode) {
      setFormRegDeadline(calculateRegistrationDeadline(formStartDate));
    }
  }, [formStartDate, isEditMode]);

  // Table data
  const cohorts = useMemo(() => {
    const records: ApiCohort[] = data?.records ?? [];
    const now = new Date();
    return records.map((c) => {
      const totalWeeks = c.weeks?.length ?? 0;
      const start = new Date(c.startDate);
      const status = computeStatus(c.startDate, c.endDate);

      let completedWeeks = 0;
      if (status === 'Completed') {
        completedWeeks = totalWeeks;
      } else if (status === 'Active' && totalWeeks > 0) {
        const msElapsed = now.getTime() - start.getTime();
        completedWeeks = Math.max(0, Math.min(Math.floor(msElapsed / (7 * 24 * 60 * 60 * 1000)), totalWeeks));
      }

      return {
        id: c.id,
        name: cohortTypeToName(c.type as CohortType),
        type: c.type,
        season: c.season,
        status,
        startDate: c.startDate,
        endDate: c.endDate,
        weeks: totalWeeks,
        completedWeeks,
        raw: c,
      };
    });
  }, [data]);

  const grouped = useMemo(() => {
    const active = cohorts.filter((c) => c.status === 'Active');
    const upcoming = cohorts.filter((c) => c.status === 'Upcoming');
    const completed = cohorts.filter((c) => c.status === 'Completed');
    return { Active: active, Upcoming: upcoming, Completed: completed };
  }, [cohorts]);

  const tabs = useMemo(
    () => [
      { label: 'Active', value: 'Active', count: grouped.Active.length },
      { label: 'Upcoming', value: 'Upcoming', count: grouped.Upcoming.length },
      { label: 'Completed', value: 'Completed', count: grouped.Completed.length },
    ],
    [grouped],
  );

  const filteredCohorts = grouped[activeTab as CohortStatus] ?? [];

  const handleRowClick = useCallback(
    (cohort: CohortRow) => {
      navigate(`/cohort/${cohort.id}/week/default`, { state: { cohort: cohort.raw } });
    },
    [navigate],
  );

  const handleDownloadCSV = useCallback(() => {
    const rows = grouped[activeTab as CohortStatus] ?? [];
    downloadCSV(
      ['Cohort', 'Season', 'Status', 'Weeks', 'Start Date', 'End Date'],
      rows.map((c) => [c.name, `S${c.season}`, c.status, c.weeks ?? '', c.startDate, c.endDate]),
      `cohorts-${activeTab.toLowerCase()}.csv`,
    );
  }, [grouped, activeTab]);

  // Modal helpers
  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedCohort(null);
    setSelectedCohortType(null);
    setFormStartDate(getTodayDate());
    setFormRegDeadline('');
    setIsModalOpen(true);
  };

  const openEditModal = (cohort: CohortRow) => {
    const dto = data?.records?.find((r) => r.id === cohort.id);
    if (!dto) return;
    setIsEditMode(true);
    setSelectedCohort(dto);
    setSelectedCohortType(dto.type as CohortType);
    setFormStartDate(formatDateForInput(dto.startDate));
    setFormRegDeadline(formatDateForInput(dto.registrationDeadline));
    setIsModalOpen(true);
  };

  const handleGenerateCertificates = (cohortId: string, cohortName: string) => {
    setGeneratingCohortId(cohortId);
    generateCertificates(
      { cohortId },
      {
        onSuccess: () => {
          setGeneratingCohortId(null);
          setSnackbar({ open: true, message: `Certificates generated for ${cohortName}!`, severity: 'success' });
        },
        onError: (error) => {
          setGeneratingCohortId(null);
          let errorMessage = 'Failed to generate certificates.';
          if (typeof error === 'object' && error !== null && 'response' in error) {
            const re = error as { response?: { data?: { message?: string } } };
            if (re.response?.data?.message) errorMessage = re.response.data.message;
          }
          setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        },
      },
    );
  };


  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCohort(null);
    setSelectedCohortType(null);
    setFormStartDate('');
    setFormRegDeadline('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && !selectedCohortType) {
      setSnackbar({ open: true, message: 'Please select a cohort type.', severity: 'error' });
      return;
    }

    if (!formStartDate || !formRegDeadline) {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'error' });
      return;
    }

    try {
      if (isEditMode && selectedCohort) {
        await updateCohortMutation.mutateAsync({
          cohortId: selectedCohort.id,
          body: { startDate: formStartDate, registrationDeadline: formRegDeadline },
        });
        await refetch();
        setSnackbar({ open: true, message: 'Cohort updated successfully!', severity: 'success' });
      } else if (selectedCohortType) {
        await createCohortMutation.mutateAsync({
          type: selectedCohortType,
          startDate: formStartDate,
          registrationDeadline: formRegDeadline,
        });
        await refetch();
        setSnackbar({ open: true, message: 'Cohort created successfully!', severity: 'success' });
      }
      closeModal();
    } catch (err) {
      let errorMessage = 'Failed to save cohort. Please try again.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const re = err as { response?: { data?: { message?: string } } };
        if (re.response?.data?.message) errorMessage = re.response.data.message;
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  // Render
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', px: { xs: 2, md: 5, lg: 8 }, py: 3, fontFamily: 'Sora, sans-serif' }}>
      <Box sx={{ mx: 'auto' }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.25)',
              flexShrink: 0,
            }}
          >
            <Settings size={24} color="#fb923c" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#fafafa', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                Cohort Selection
              </Typography>
              <Chip
                label="Admin"
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  bgcolor: 'rgba(249,115,22,0.15)',
                  color: '#fb923c',
                  border: '1px solid rgba(249,115,22,0.25)',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#71717a', mt: 0.5 }}>
              Select a cohort to manage students.
            </Typography>
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', '& .MuiAlert-icon': { color: '#ef4444' } }}>
            {(error as Error)?.message ?? 'Failed to load cohorts.'}
          </Alert>
        )}

        {/* Main Card */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(39,39,42,0.5)',
            borderRadius: 3,
            border: '1px solid rgba(249,115,22,0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Tab bar + Action buttons */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'flex-end' },
              justifyContent: 'space-between',
              px: { xs: 2, sm: 3 },
              pt: 1.5,
              gap: 1.5,
            }}
          >
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <Box sx={{ display: 'flex', gap: 1, mb: { xs: 0, sm: 0.5 }, flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={15} />}
                onClick={handleDownloadCSV}
                sx={{
                  color: '#d4d4d8',
                  borderColor: '#52525b',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                CSV
              </Button>
              {isAdmin && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={15} />}
                  onClick={openCreateModal}
                  sx={{
                    bgcolor: '#f97316',
                    '&:hover': { bgcolor: '#ea580c' },
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    boxShadow: 'none',
                  }}
                >
                  Create Cohort
                </Button>
              )}
            </Box>
          </Box>

          {/* Table */}
          <CohortTable
            cohorts={filteredCohorts}
            onRowClick={handleRowClick}
            loading={isLoading}
            emptyMessage={`No ${activeTab.toLowerCase()} cohorts found.`}
            actions={isAdmin ? (cohort) => (
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                {cohort.status !== 'Completed' && (
                  <Tooltip title="Edit cohort" placement="top">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); openEditModal(cohort); }}
                      sx={{
                        color: '#d4d4d8',
                        border: '1px solid #52525b',
                        borderRadius: 1,
                        p: 0.75,
                        '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
                      }}
                    >
                      <Pencil size={14} />
                    </IconButton>
                  </Tooltip>
                )}
                {cohort.status === 'Completed' && (
                  <Tooltip title="Preview certificates" placement="top">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setPreviewCohort({ id: cohort.id, name: cohort.name }); }}
                      sx={{
                        border: '1px solid rgba(245,158,11,0.4)',
                        borderRadius: 1,
                        p: 0.75,
                        color: '#f59e0b',
                        '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245,158,11,0.08)' },
                      }}
                    >
                      <Eye size={14} />
                    </IconButton>
                  </Tooltip>
                )}
                <BulkDownloadCertButton
                  cohortId={cohort.id}
                  onError={(msg) => setSnackbar({ open: true, message: msg, severity: 'error' })}
                />
              </Box>
            ) : undefined}
          />
        </Paper>
      </Box>

      {/* Create / Edit Modal */}
      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: { sx: { backdropFilter: 'blur(6px)', bgcolor: 'rgba(0,0,0,0.7)' } },
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c1c1e',
            backgroundImage: 'none',
            borderRadius: 3,
            border: '1px solid #3f3f46',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>
              {isEditMode ? 'Edit Cohort' : 'Create Cohort'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#a1a1aa' }}>
              {isEditMode
                ? `Update details for ${selectedCohortType ? cohortTypeToName(selectedCohortType) : ''} cohort.`
                : 'Fill out the information to create a new cohort.'}
            </Typography>
          </Box>
          <IconButton onClick={closeModal} size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#fafafa' } }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
            {/* Cohort Type */}
            {!isEditMode && (
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Cohort Type</InputLabel>
                <Select
                  value={selectedCohortType ?? ''}
                  label="Cohort Type"
                  onChange={(e) => setSelectedCohortType(e.target.value as CohortType)}
                  required
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } } }}
                >
                  {COHORT_TYPES.map((ct) => (
                    <MenuItem key={ct} value={ct} sx={{ '&:hover': { bgcolor: '#52525b' } }}>
                      {cohortTypeToName(ct)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Start Date */}
            <TextField
              label="Start Date"
              type="date"
              value={formStartDate}
              onChange={(e) => setFormStartDate(e.target.value)}
              slotProps={{ htmlInput: { min: getTodayDate() }, inputLabel: { shrink: true } }}
              required
              sx={{ ...inputSx, '& input': { colorScheme: 'dark' } }}
            />

            {/* Registration Deadline */}
            <TextField
              label="Registration Deadline"
              type="date"
              value={formRegDeadline}
              onChange={(e) => setFormRegDeadline(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              sx={{ ...inputSx, '& input': { colorScheme: 'dark' } }}
            />

          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={closeModal}
              variant="outlined"
              sx={{
                color: '#d4d4d8',
                borderColor: '#52525b',
                textTransform: 'none',
                '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createCohortMutation.isPending || updateCohortMutation.isPending}
              sx={{
                bgcolor: '#f97316',
                '&:hover': { bgcolor: '#ea580c' },
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                '&.Mui-disabled': { bgcolor: '#78350f', color: '#92400e' },
              }}
            >
              {createCohortMutation.isPending || updateCohortMutation.isPending
                ? <CircularProgress size={20} sx={{ color: '#fff' }} />
                : isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Certificate Preview Modal */}
      {previewCohort && (
        <CertificatePreviewModal
          cohortId={previewCohort.id}
          cohortName={previewCohort.name}
          onClose={() => setPreviewCohort(null)}
          onGenerate={() => handleGenerateCertificates(previewCohort.id, previewCohort.name)}
          isGenerating={isGeneratingCerts && generatingCohortId === previewCohort.id}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
