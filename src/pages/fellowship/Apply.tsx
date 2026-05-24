import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  CircleDashed,
  Code2,
  Lightbulb,
  PenTool,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { IconButton } from '@mui/material';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import {
  useApplication,
  useApplicationProposal,
  useCreateApplication,
  useDeleteApplication,
  useSubmitApplication,
  useUpdateApplication,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipApplicationStatus,
  FellowshipType,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';
import {
  EMPTY_PROPOSAL_FIELDS as EMPTY_FIELDS,
  parseProposal,
  serializeProposal,
  validateGithub,
  validateLink,
  type ProposalFields,
} from '../../utils/proposalFormat';

type TrackOption = {
  value: FellowshipType;
  title: string;
  description: string;
  icon: typeof Code2;
};

const TRACK_OPTIONS: TrackOption[] = [
  {
    value: FellowshipType.DEVELOPER,
    title: 'Developer',
    description: 'Contribute to Bitcoin / Lightning open-source projects.',
    icon: Code2,
  },
  {
    value: FellowshipType.DESIGNER,
    title: 'Designer',
    description: 'Design Bitcoin-native products, docs, and learning experiences.',
    icon: PenTool,
  },
  {
    value: FellowshipType.EDUCATOR,
    title: 'Educator',
    description: 'Teach, write, and build curriculum on Bitcoin protocol.',
    icon: BookOpen,
  },
];

const TRACK_BY_VALUE: Record<FellowshipType, TrackOption> = TRACK_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.value]: opt }),
  {} as Record<FellowshipType, TrackOption>,
);

const formatRelativeTime = (date: Date | null, now: number): string => {
  if (!date) return '';
  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.floor(diffSec / 60);
  if (min === 1) return 'one min ago';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr === 1) return '1 hr ago';
  if (hr < 24) return `${hr} hr ago`;
  return date.toLocaleDateString();
};

type StepIndex = 0 | 1 | 2;

const STEP_LABELS = ['Track', 'Proposal', 'Review & submit'] as const;

const Apply = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const appIdFromUrl = searchParams.get('appId');

  const [selectedType, setSelectedType] = useState<FellowshipType | null>(null);
  const [fields, setFields] = useState<ProposalFields>(EMPTY_FIELDS);
  const [activeId, setActiveId] = useState<string | null>(appIdFromUrl);
  const [step, setStep] = useState<StepIndex>(0);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadedApp = useApplication(activeId ?? '', { enabled: !!activeId });
  const loadedProposal = useApplicationProposal(activeId ?? '', { enabled: !!activeId });

  const createMut = useCreateApplication();
  const updateMut = useUpdateApplication();
  const submitMut = useSubmitApplication();
  const deleteMut = useDeleteApplication();

  useEffect(() => {
    if (appIdFromUrl && appIdFromUrl !== activeId) setActiveId(appIdFromUrl);
  }, [appIdFromUrl, activeId]);

  useEffect(() => {
    if (activeId && loadedProposal.data?.proposal !== undefined) {
      setFields(parseProposal(loadedProposal.data.proposal));
    }
  }, [activeId, loadedProposal.data?.proposal]);

  useEffect(() => {
    if (activeId && loadedApp.data?.type) setSelectedType(loadedApp.data.type);
  }, [activeId, loadedApp.data?.type]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const currentApp = activeId ? loadedApp.data : null;
  const isEditable = !activeId || currentApp?.status === FellowshipApplicationStatus.DRAFT;

  const proposalReady = useMemo(() => {
    if (fields.problemStatement.trim().length === 0) return false;
    if (fields.plan.trim().length === 0) return false;
    if (validateGithub(fields.github)) return false;
    if (fields.links.some((l) => validateLink(l))) return false;
    return true;
  }, [fields.problemStatement, fields.plan, fields.github, fields.links]);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!activeId || !isEditable) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await updateMut.mutateAsync({
          id: activeId,
          body: { proposal: serializeProposal(fields) },
        });
        setLastSavedAt(new Date());
      } catch {
        // silent — user can use the Save draft button to surface the error
      }
    }, 1500);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, activeId, isEditable]);

  const resetEditor = () => {
    setActiveId(null);
    setFields(EMPTY_FIELDS);
    setSelectedType(null);
    setStep(0);
    setLastSavedAt(null);
    if (searchParams.has('appId')) {
      searchParams.delete('appId');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const ensureDraftExists = async (): Promise<string | null> => {
    if (activeId) return activeId;
    if (!selectedType) return null;
    try {
      const created = await createMut.mutateAsync({
        type: selectedType,
        proposal: serializeProposal(fields),
      });
      setActiveId(created.id);
      setLastSavedAt(new Date());
      return created.id;
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
      return null;
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedType) return;
    try {
      if (activeId) {
        await updateMut.mutateAsync({
          id: activeId,
          body: { proposal: serializeProposal(fields) },
        });
        setLastSavedAt(new Date());
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const id = await ensureDraftExists();
        if (id) setToast({ kind: 'success', msg: 'Draft created.' });
      }
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleContinueFromTrack = async () => {
    if (!selectedType) return;
    await ensureDraftExists();
    setStep(1);
  };

  const handleContinueFromProposal = () => {
    if (!proposalReady) return;
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!activeId) return;
    try {
      await updateMut.mutateAsync({
        id: activeId,
        body: { proposal: serializeProposal(fields) },
      });
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

  const setField = <K extends keyof ProposalFields>(k: K, v: ProposalFields[K]) =>
    setFields((prev) => ({ ...prev, [k]: v }));

  return (
    <FellowshipPageLayout
      title="Apply for a Fellowship"
      subtitle="Submit a proposal to work on Bitcoin/Lightning open-source for 6 months."
      hideIcon
    >
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Stepper
        step={step}
        trackLabel={selectedType ? TRACK_BY_VALUE[selectedType].title : null}
        onJump={(i) => {
          if (i === 0) setStep(0);
          if (i === 1 && selectedType) setStep(1);
          if (i === 2 && selectedType && proposalReady) setStep(2);
        }}
      />

      {step === 0 && (
        <TrackStep
          selectedType={selectedType}
          disabled={!isEditable}
          onSelect={setSelectedType}
          onSaveDraft={handleSaveDraft}
          onContinue={handleContinueFromTrack}
          canSaveDraft={!!selectedType && !createMut.isPending && !updateMut.isPending}
          isSaving={createMut.isPending}
          isContinuing={createMut.isPending}
        />
      )}

      {step === 1 && (
        <ProposalStep
          fields={fields}
          disabled={!isEditable}
          autosavedLabel={formatRelativeTime(lastSavedAt, now)}
          onChange={setField}
          onBack={() => setStep(0)}
          onSaveDraft={handleSaveDraft}
          onContinue={handleContinueFromProposal}
          isSaving={updateMut.isPending || createMut.isPending}
          canContinue={proposalReady}
          showDiscard={!!activeId && isEditable}
          onDiscard={handleDiscard}
          isDiscarding={deleteMut.isPending}
        />
      )}

      {step === 2 && selectedType && (
        <ReviewStep
          track={TRACK_BY_VALUE[selectedType]}
          fields={fields}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          isSubmitting={submitMut.isPending || updateMut.isPending}
          canSubmit={!!activeId && isEditable && proposalReady && !submitMut.isPending}
        />
      )}
    </FellowshipPageLayout>
  );
};

// ---- Stepper ----

const Stepper = ({
  step,
  trackLabel,
  onJump,
}: {
  step: StepIndex;
  trackLabel: string | null;
  onJump: (i: StepIndex) => void;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 2,
        px: { xs: 2.5, md: 3.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        mb: 2.5,
      }}
    >
      {STEP_LABELS.map((label, i) => {
        const idx = i as StepIndex;
        const isActive = step === idx;
        const isDone = step > idx;
        const showTrackName = i === 0 && isDone && trackLabel;
        const segmentDone = step > idx;
        return (
          <Fragment key={label}>
            <Box
              onClick={() => onJump(idx)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                cursor: 'pointer',
                opacity: isActive || isDone ? 1 : 0.55,
                transition: 'opacity 0.2s ease',
                '&:hover': { opacity: 1 },
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isActive ? 'primary.main' : isDone ? 'rgba(74,222,128,0.15)' : 'transparent',
                  border: '1.5px solid',
                  borderColor: isActive ? 'primary.main' : isDone ? 'success.main' : 'divider',
                  color: isActive ? '#fff' : isDone ? 'success.main' : 'text.secondary',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {isDone ? <Check size={14} strokeWidth={3} /> : i + 1}
              </Box>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  color: isActive || isDone ? 'text.primary' : 'text.secondary',
                }}
              >
                {label}
                {showTrackName && (
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {' '}
                    · {trackLabel}
                  </Box>
                )}
              </Typography>
            </Box>
            {i < STEP_LABELS.length - 1 && (
              <Box
                sx={{
                  flex: 1,
                  height: '1px',
                  minWidth: 24,
                  bgcolor: segmentDone ? 'success.main' : 'divider',
                  opacity: segmentDone ? 0.5 : 1,
                  transition: 'background-color 0.2s ease',
                }}
              />
            )}
          </Fragment>
        );
      })}
    </Box>
  );
};

// ---- Step 1: Track ----

const TrackStep = ({
  selectedType,
  disabled,
  onSelect,
  onSaveDraft,
  onContinue,
  canSaveDraft,
  isSaving,
  isContinuing,
}: {
  selectedType: FellowshipType | null;
  disabled: boolean;
  onSelect: (t: FellowshipType) => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  canSaveDraft: boolean;
  isSaving: boolean;
  isContinuing: boolean;
}) => {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        p: { xs: 2.5, md: 3.5 },
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
      >
        STEP 1 OF 3
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
        Choose your fellowship track
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Selection determines reviewers and rubric.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {TRACK_OPTIONS.map((opt) => {
          const active = selectedType === opt.value;
          const Icon = opt.icon;
          return (
            <Box
              key={opt.value}
              onClick={() => !disabled && onSelect(opt.value)}
              sx={{
                position: 'relative',
                p: 2.25,
                borderRadius: 0.6,
                border: '1.5px solid',
                borderColor: active ? 'primary.main' : 'divider',
                bgcolor: active ? 'rgba(249,115,22,0.06)' : 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.2s ease',
                '&:hover': disabled
                  ? {}
                  : {
                      borderColor: active ? 'primary.main' : 'primary.light',
                      bgcolor: active ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.03)',
                    },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: active ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid',
                  borderColor: active ? 'rgba(249,115,22,0.25)' : 'divider',
                  mb: 1.5,
                }}
              >
                <Icon size={16} color={active ? '#fb923c' : '#a1a1aa'} />
              </Box>
              {active && (
                <Box sx={{ position: 'absolute', top: 12, right: 12, color: 'primary.main' }}>
                  <CheckCircle2 size={18} fill="#f97316" color="#0a0a0a" strokeWidth={2.5} />
                </Box>
              )}
              <Typography sx={{ fontWeight: 600, mb: 0.25 }}>{opt.title}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {opt.description}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Stack
        direction="row"
        spacing={1.25}
        justifyContent="flex-end"
      >
        <Button variant="outlined" onClick={onSaveDraft} disabled={!canSaveDraft}>
          {isSaving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button
          variant="contained"
          onClick={onContinue}
          disabled={!selectedType || disabled || isContinuing}
          endIcon={<ArrowRight size={16} />}
        >
          Continue
        </Button>
      </Stack>
    </Box>
  );
};

// ---- Step 2: Proposal ----

const RUBRIC_ITEMS: { label: string; hint: string; emphasis?: boolean }[] = [
  { label: 'Scope', hint: 'feasible in 6 mo' },
  { label: 'Impact', hint: 'benefits OSS ecosystem' },
  { label: 'Skill fit', hint: 'prior work shows it' },
  { label: 'Clarity', hint: 'readable plan', emphasis: true },
];

const ProposalStep = ({
  fields,
  disabled,
  autosavedLabel,
  onChange,
  onBack,
  onSaveDraft,
  onContinue,
  isSaving,
  canContinue,
  showDiscard,
  onDiscard,
  isDiscarding,
}: {
  fields: ProposalFields;
  disabled: boolean;
  autosavedLabel: string;
  onChange: <K extends keyof ProposalFields>(k: K, v: ProposalFields[K]) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  isSaving: boolean;
  canContinue: boolean;
  showDiscard: boolean;
  onDiscard: () => void;
  isDiscarding: boolean;
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 280px' },
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.75,
          bgcolor: 'background.paper',
          p: { xs: 2.5, md: 3.5 },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
          >
            STEP 2 OF 3
          </Typography>
          {autosavedLabel && (
            <Typography
              variant="caption"
              sx={{
                color: 'success.main',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <CircleDashed size={12} /> Autosaved {autosavedLabel}
            </Typography>
          )}
        </Stack>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
          Proposal
        </Typography>

        <FieldLabel>Project title</FieldLabel>
        <TextField
          fullWidth
          value={fields.title}
          onChange={(e) => onChange('title', e.target.value)}
          disabled={disabled}
          placeholder="BIP-324 transport relay — large-scale fuzz testing harness"
          sx={{ mb: 2.5 }}
        />

        <FieldLabel>Problem statement</FieldLabel>
        <TextField
          fullWidth
          multiline
          minRows={4}
          value={fields.problemStatement}
          onChange={(e) => onChange('problemStatement', e.target.value)}
          disabled={disabled}
          placeholder="What gap are you closing, and why does it matter for the ecosystem? Link to the relevant issues, RFCs, or discussions."
          sx={{ mb: 2.5 }}
        />

        <FieldLabel>6-month plan & milestones</FieldLabel>
        <TextField
          fullWidth
          multiline
          minRows={6}
          value={fields.plan}
          onChange={(e) => onChange('plan', e.target.value)}
          disabled={disabled}
          placeholder={`Month 1–2: scope, prior-art review, first PR\nMonth 3–4: core implementation, tests\nMonth 5–6: integration, docs, handoff`}
          sx={{ mb: 2.5 }}
        />

        <FieldLabel>GitHub handle</FieldLabel>
        <TextField
          fullWidth
          value={fields.github}
          onChange={(e) => onChange('github', e.target.value)}
          disabled={disabled}
          placeholder="@aarav-m"
          error={!!validateGithub(fields.github)}
          helperText={validateGithub(fields.github) ?? ' '}
          sx={{ mb: 2 }}
        />

        <FieldLabel>Links (portfolio, LinkedIn, prior work)</FieldLabel>
        <Stack spacing={1.25} sx={{ mb: 1 }}>
          {fields.links.map((link, idx) => {
            const error = validateLink(link);
            const showRemove = fields.links.length > 1;
            return (
              <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  fullWidth
                  value={link}
                  onChange={(e) => {
                    const next = [...fields.links];
                    next[idx] = e.target.value;
                    onChange('links', next);
                  }}
                  disabled={disabled}
                  placeholder="https://linkedin.com/in/aarav-m"
                  error={!!error}
                  helperText={error ?? ' '}
                />
                {showRemove && !disabled && (
                  <IconButton
                    aria-label="Remove link"
                    onClick={() => {
                      const next = fields.links.filter((_, i) => i !== idx);
                      onChange('links', next.length ? next : ['']);
                    }}
                    sx={{ mt: 0.5, color: 'text.secondary' }}
                  >
                    <X size={16} />
                  </IconButton>
                )}
              </Stack>
            );
          })}
        </Stack>
        <Button
          size="small"
          variant="text"
          startIcon={<Plus size={14} />}
          disabled={disabled || fields.links.some((l) => !l.trim())}
          onClick={() => onChange('links', [...fields.links, ''])}
          sx={{ mb: 2, alignSelf: 'flex-start' }}
        >
          Add another link
        </Button>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Button
            onClick={onBack}
            startIcon={<ArrowLeft size={16} />}
            sx={{ color: 'text.secondary', alignSelf: { xs: 'flex-start', sm: 'center' } }}
          >
            Back
          </Button>
          <Stack direction="row" spacing={1.25} flexWrap="wrap" justifyContent="flex-end">
            {showDiscard && (
              <Button
                variant="text"
                color="error"
                startIcon={<Trash2 size={16} />}
                onClick={onDiscard}
                disabled={isDiscarding}
              >
                Discard
              </Button>
            )}
            <Button variant="outlined" onClick={onSaveDraft} disabled={isSaving || disabled}>
              {isSaving ? 'Saving…' : 'Save draft'}
            </Button>
            <Button
              variant="contained"
              onClick={onContinue}
              disabled={!canContinue || disabled}
              endIcon={<ArrowRight size={16} />}
            >
              Continue
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.75,
            bgcolor: 'background.paper',
            p: 2.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              letterSpacing: 1.2,
              fontWeight: 600,
              display: 'block',
              mb: 1.5,
            }}
          >
            REVIEWER RUBRIC
          </Typography>
          <Stack spacing={1.25}>
            {RUBRIC_ITEMS.map((item) => (
              <Stack key={item.label} direction="row" spacing={1.25} alignItems="flex-start">
                <Box sx={{ color: item.emphasis ? 'warning.main' : 'success.main', mt: '2px' }}>
                  <Check size={14} strokeWidth={3} />
                </Box>
                <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Box>
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {' '}
                    — {item.hint}
                  </Box>
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0.75,
            bgcolor: 'background.paper',
            p: 2.5,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Lightbulb size={14} color="#fbbf24" />
            <Typography
              variant="caption"
              sx={{ color: 'warning.main', letterSpacing: 1.2, fontWeight: 700 }}
            >
              TIP
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
            Link to existing PRs or sketches. Concrete examples win reviewer trust faster than abstract pitches.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="caption"
    sx={{
      color: 'text.secondary',
      letterSpacing: 1.2,
      fontWeight: 600,
      display: 'block',
      mb: 0.75,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </Typography>
);

// ---- Step 3: Review ----

const ReviewStep = ({
  track,
  fields,
  onBack,
  onSubmit,
  isSubmitting,
  canSubmit,
}: {
  track: TrackOption;
  fields: ProposalFields;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}) => {
  const Icon = track.icon;
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        p: { xs: 2.5, md: 3.5 },
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
      >
        STEP 3 OF 3
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 3 }}>
        Review & submit
      </Typography>

      <Stack spacing={2.5}>
        <Box>
          <FieldLabel>Track</FieldLabel>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(249,115,22,0.12)',
                border: '1px solid rgba(249,115,22,0.25)',
              }}
            >
              <Icon size={16} color="#fb923c" />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600 }}>{track.title}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {track.description}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {fields.title.trim() && (
          <Box>
            <FieldLabel>Project title</FieldLabel>
            <Typography>{fields.title}</Typography>
          </Box>
        )}

        <Box>
          <FieldLabel>Problem statement</FieldLabel>
          <Typography
            variant="body2"
            sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {fields.problemStatement || '—'}
          </Typography>
        </Box>

        <Box>
          <FieldLabel>6-month plan & milestones</FieldLabel>
          <Typography
            variant="body2"
            sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {fields.plan || '—'}
          </Typography>
        </Box>

        <Box>
          <FieldLabel>GitHub handle</FieldLabel>
          <Typography variant="body2">{fields.github || '—'}</Typography>
        </Box>
        <Box>
          <FieldLabel>Links</FieldLabel>
          {fields.links.filter((l) => l.trim()).length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              —
            </Typography>
          ) : (
            <Stack spacing={0.5}>
              {fields.links
                .filter((l) => l.trim())
                .map((l, i) => (
                  <Typography
                    key={i}
                    variant="body2"
                    sx={{ wordBreak: 'break-all', color: 'text.primary' }}
                  >
                    {l}
                  </Typography>
                ))}
            </Stack>
          )}
        </Box>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.25}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}
      >
        <Button
          onClick={onBack}
          startIcon={<ArrowLeft size={16} />}
          sx={{ color: 'text.secondary', alignSelf: { xs: 'flex-start', sm: 'center' } }}
        >
          Back
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={!canSubmit}>
          {isSubmitting ? 'Submitting…' : 'Submit application'}
        </Button>
      </Stack>
    </Box>
  );
};

export default Apply;
