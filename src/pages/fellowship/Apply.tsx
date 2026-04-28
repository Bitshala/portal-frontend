import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Collapse,
  Fade,
  Grid,
  Grow,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import { Trash2 } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import {
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
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';
import { PROPOSAL_TEMPLATES, isTemplate } from './proposalTemplates';

const TYPE_OPTIONS: { value: FellowshipType; title: string; description: string }[] = [
  { value: FellowshipType.DEVELOPER, title: 'Developer', description: 'Contribute to Bitcoin / Lightning open-source projects.' },
  { value: FellowshipType.DESIGNER, title: 'Designer', description: 'Design Bitcoin-native products, docs, and learning experiences.' },
  { value: FellowshipType.EDUCATOR, title: 'Educator', description: 'Teach, write, and build curriculum on Bitcoin protocol.' },
];

const Apply = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const appIdFromUrl = searchParams.get('appId');
  const [selectedType, setSelectedType] = useState<FellowshipType | null>(null);
  const [proposal, setProposal] = useState('');
  const [activeId, setActiveId] = useState<string | null>(appIdFromUrl);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  const loadedApp = useApplication(activeId ?? '', { enabled: !!activeId });
  const loadedProposal = useApplicationProposal(activeId ?? '', {
    enabled: !!activeId,
  });

  useEffect(() => {
    if (appIdFromUrl && appIdFromUrl !== activeId) setActiveId(appIdFromUrl);
  }, [appIdFromUrl, activeId]);

  const createMut = useCreateApplication();
  const updateMut = useUpdateApplication();
  const submitMut = useSubmitApplication();
  const deleteMut = useDeleteApplication();

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
    if (searchParams.has('appId')) {
      searchParams.delete('appId');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleTypeSelect = (type: FellowshipType) => {
    setSelectedType(type);
    if (activeId) return;
    const template = PROPOSAL_TEMPLATES[type];
    setProposal((prev) => (prev.trim() === '' || isTemplate(prev) ? template : prev));
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
    <FellowshipPageLayout title="Apply for a Fellowship" subtitle="Submit a proposal for a Bitshala fellowship.">
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                1. Choose fellowship type
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 3 }} alignItems="stretch">
                {TYPE_OPTIONS.map((opt, idx) => {
                  const disabled = !isEditable;
                  const active = selectedType === opt.value;
                  return (
                    <Grid size={{ xs: 12, sm: 4 }} key={opt.value} sx={{ display: 'flex' }}>
                      <Grow in timeout={400 + idx * 120} style={{ transformOrigin: 'top center', width: '100%' }}>
                        <Box
                          onClick={() => !disabled && handleTypeSelect(opt.value)}
                          sx={{
                            p: 2,
                            borderRadius: 1.5,
                            border: '1.5px solid',
                            borderColor: active ? 'primary.main' : 'divider',
                            bgcolor: active ? 'rgba(249,115,22,0.06)' : 'background.paper',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transform: active ? 'translateY(-2px)' : 'none',
                            boxShadow: active ? '0 6px 20px rgba(249,115,22,0.15)' : 'none',
                            '&:hover': disabled
                              ? {}
                              : {
                                  borderColor: 'primary.light',
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                                },
                          }}
                        >
                          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>{opt.title}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {opt.description}
                          </Typography>
                        </Box>
                      </Grow>
                    </Grid>
                  );
                })}
              </Grid>

              <Collapse in={!!selectedType} timeout={450} unmountOnExit>
                <Fade in={!!selectedType} timeout={600}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                      2. Proposal
                    </Typography>
                    {currentApp && currentApp.status === FellowshipApplicationStatus.REJECTED && currentApp.reviewerRemarks && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        <strong>Reviewer remarks:</strong> {currentApp.reviewerRemarks}
                      </Alert>
                    )}
                    <Box
                      data-color-mode="dark"
                      sx={{
                        '& .w-md-editor': {
                          boxShadow: 'none',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: '#18181b',
                        },
                        opacity: !isEditable || (!!activeId && loadedProposal.isLoading) ? 0.6 : 1,
                        pointerEvents:
                          !isEditable || (!!activeId && loadedProposal.isLoading) ? 'none' : 'auto',
                      }}
                    >
                      <MDEditor
                        value={proposal}
                        onChange={(v) => setProposal(v ?? '')}
                        height={640}
                        visibleDragbar
                        preview="live"
                        textareaProps={{
                          placeholder:
                            'Write your proposal in markdown. What do you want to build, why, and how? Include links, milestones, prior work, and a rough timeline.',
                        }}
                      />
                    </Box>

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
                    </Stack>
                  </Box>
                </Fade>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </FellowshipPageLayout>
  );
};

export default Apply;
