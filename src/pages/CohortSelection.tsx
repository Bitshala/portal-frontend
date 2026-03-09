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
} from 'lucide-react';
import { useCohorts, useCreateCohort, useUpdateCohort } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { useGenerateCohortCertificates } from '../hooks/certificateHooks';
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
  const [downloadingCohortId, setDownloadingCohortId] = useState<string | null>(null);

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

  const handleDownloadCertificates = async (cohortId: string, cohortName: string) => {
    setDownloadingCohortId(cohortId);
    try {
      const certificates = await apiService.getCohortCertificates(cohortId);
      if (certificates.length === 0) {
        setSnackbar({ open: true, message: 'No certificates found. Generate certificates first.', severity: 'error' });
        return;
      }
      for (const cert of certificates) {
        const blob = await apiService.downloadCertificate(cert.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${cert.name}-${cert.certificateType}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
      setSnackbar({ open: true, message: `Downloaded ${certificates.length} certificates for ${cohortName}!`, severity: 'success' });
    } catch (error) {
      let errorMessage = 'Failed to download certificates.';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const re = error as { response?: { data?: { message?: string } } };
        if (re.response?.data?.message) errorMessage = re.response.data.message;
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setDownloadingCohortId(null);
    }
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
              <>
                {cohort.status !== 'Completed' && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Pencil size={13} />}
                    onClick={() => openEditModal(cohort)}
                    sx={{
                      color: '#d4d4d8',
                      borderColor: '#52525b',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 0.5,
                      '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
                    }}
                  >
                    Edit
                  </Button>
                )}
                {cohort.status === 'Completed' && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={
                        isGeneratingCerts && generatingCohortId === cohort.id
                          ? <CircularProgress size={13} sx={{ color: '#fff' }} />
                          : undefined
                      }
                      disabled={isGeneratingCerts && generatingCohortId === cohort.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateCertificates(cohort.id, cohort.name);
                      }}
                      sx={{
                        bgcolor: '#f59e0b',
                        color: '#000',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        py: 0.5,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#d97706', boxShadow: 'none' },
                        '&.Mui-disabled': { bgcolor: '#78350f', color: '#92400e' },
                      }}
                    >
                      Generate Certs
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={
                        downloadingCohortId === cohort.id
                          ? <CircularProgress size={13} sx={{ color: '#fff' }} />
                          : <Download size={13} />
                      }
                      disabled={downloadingCohortId === cohort.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadCertificates(cohort.id, cohort.name);
                      }}
                      sx={{
                        bgcolor: '#14b8a6',
                        color: '#000',
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        py: 0.5,
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#0d9488', boxShadow: 'none' },
                        '&.Mui-disabled': { bgcolor: '#115e59', color: '#0d3d38' },
                      }}
                    >
                      Download Certs
                    </Button>
                  </>
                )}
              </>
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
