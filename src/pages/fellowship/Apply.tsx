import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import FellowshipLayout from '../../components/fellowship/FellowshipLayout';
import StatusChip from '../../components/fellowship/StatusChip';
import {
  useMyApplications,
  useApplication,
  useApplicationProposal,
  useCreateApplication,
  useUpdateApplication,
  useSubmitApplication,
  useDeleteApplication,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  FellowshipType,
  type GetFellowshipApplicationResponseDto,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

const TYPE_OPTIONS: { value: FellowshipType; title: string; description: string }[] = [
  { value: FellowshipType.DEVELOPER, title: 'Developer', description: 'Contribute to Bitcoin / Lightning open-source projects.' },
  { value: FellowshipType.DESIGNER, title: 'Designer', description: 'Design Bitcoin-native products, docs, and learning experiences.' },
  { value: FellowshipType.EDUCATOR, title: 'Educator', description: 'Teach, write, and build curriculum on Bitcoin protocol.' },
];

const isActiveStatus = (s: FellowshipApplicationStatus) =>
  s === FellowshipApplicationStatus.DRAFT || s === FellowshipApplicationStatus.SUBMITTED;

const Apply = () => {
  const [selectedType, setSelectedType] = useState<FellowshipType | null>(null);
  const [proposal, setProposal] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const myList = useMyApplications({ page: 0, pageSize: 20 });
  const loadedApp = useApplication(activeId ?? '', { enabled: !!activeId });
  const loadedProposal = useApplicationProposal(activeId ?? '', {
    enabled: !!activeId && loadedApp.data?.status === FellowshipApplicationStatus.DRAFT,
  });

  const createMut = useCreateApplication();
  const updateMut = useUpdateApplication();
  const submitMut = useSubmitApplication();
  const deleteMut = useDeleteApplication();

  const records = myList.data?.records ?? [];

  const usedTypes = useMemo(() => {
    const set = new Set<FellowshipType>();
    for (const r of records) if (isActiveStatus(r.status)) set.add(r.type);
    return set;
  }, [records]);

  useEffect(() => {
    if (activeId && loadedProposal.data?.proposal !== undefined) {
      setProposal(loadedProposal.data.proposal);
    }
  }, [activeId, loadedProposal.data?.proposal]);

  useEffect(() => {
    if (activeId && loadedApp.data?.type) setSelectedType(loadedApp.data.type);
  }, [activeId, loadedApp.data?.type]);

  const resetEditor = () => {
    setActiveId(null);
    setProposal('');
    setSelectedType(null);
  };

  const handleSelectRow = (app: GetFellowshipApplicationResponseDto) => {
    setActiveId(app.id);
    setSelectedType(app.type);
  };

  const handleSaveDraft = async () => {
    if (!selectedType || !proposal.trim()) return;
    try {
      if (activeId) {
        await updateMut.mutateAsync({ id: activeId, body: { proposal } });
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const created = await createMut.mutateAsync({ type: selectedType, proposal });
        setActiveId(created.id);
        setToast({ kind: 'success', msg: 'Draft created.' });
      }
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleSubmit = async () => {
    if (!activeId) return;
    try {
      await submitMut.mutateAsync({ id: activeId });
      setToast({ kind: 'success', msg: 'Application submitted — check your email.' });
      resetEditor();
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleDiscard = async () => {
    if (!activeId) return;
    if (!confirm('Discard this draft? This cannot be undone.')) return;
    try {
      await deleteMut.mutateAsync({ id: activeId });
      setToast({ kind: 'success', msg: 'Draft discarded.' });
      resetEditor();
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const currentApp = activeId ? loadedApp.data : null;
  const isEditable = !activeId || currentApp?.status === FellowshipApplicationStatus.DRAFT;
  const canSubmit = !!activeId && isEditable && proposal.trim().length > 0 && !submitMut.isPending;

  return (
    <FellowshipLayout title="Apply for a Fellowship">
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                1. Choose fellowship type
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {TYPE_OPTIONS.map((opt) => {
                  const disabled = !isEditable || (usedTypes.has(opt.value) && opt.value !== selectedType);
                  const active = selectedType === opt.value;
                  return (
                    <Grid size={{ xs: 12, sm: 4 }} key={opt.value}>
                      <Box
                        onClick={() => !disabled && setSelectedType(opt.value)}
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          border: '1.5px solid',
                          borderColor: active ? 'primary.main' : 'divider',
                          bgcolor: active ? 'rgba(249,115,22,0.06)' : 'background.paper',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.5 : 1,
                          transition: 'all 0.15s ease',
                          '&:hover': disabled ? {} : { borderColor: 'primary.light' },
                        }}
                      >
                        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{opt.title}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {opt.description}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>

              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                2. Proposal
              </Typography>
              {currentApp && currentApp.status === FellowshipApplicationStatus.REJECTED && currentApp.reviewerRemarks && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>Reviewer remarks:</strong> {currentApp.reviewerRemarks}
                </Alert>
              )}
              <TextField
                multiline
                fullWidth
                minRows={12}
                maxRows={24}
                placeholder="Write your proposal in markdown. What do you want to build, why, and how? Include links, milestones, prior work, and a rough timeline."
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                disabled={!isEditable || (!!activeId && loadedProposal.isLoading)}
              />

              <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleSaveDraft}
                  disabled={!isEditable || !selectedType || !proposal.trim() || createMut.isPending || updateMut.isPending}
                >
                  {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save draft'}
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
                  {submitMut.isPending ? 'Submitting…' : 'Submit application'}
                </Button>
                {activeId && isEditable && (
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<Trash2 size={16} />}
                    onClick={handleDiscard}
                    disabled={deleteMut.isPending}
                  >
                    Discard draft
                  </Button>
                )}
                {activeId && (
                  <Button variant="text" onClick={resetEditor}>
                    New application
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                My applications
              </Typography>
              {myList.isLoading && <CircularProgress size={20} />}
              {!myList.isLoading && records.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  You haven't applied yet.
                </Typography>
              )}
              <Stack spacing={1} divider={<Divider flexItem />}>
                {records.map((app) => {
                  const selected = app.id === activeId;
                  return (
                    <Box
                      key={app.id}
                      onClick={() => handleSelectRow(app)}
                      sx={{
                        p: 1.25,
                        borderRadius: 1,
                        cursor: 'pointer',
                        bgcolor: selected ? 'rgba(249,115,22,0.06)' : 'transparent',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {app.type}
                        </Typography>
                        <StatusChip status={app.status} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Updated {new Date(app.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </FellowshipLayout>
  );
};

export default Apply;
