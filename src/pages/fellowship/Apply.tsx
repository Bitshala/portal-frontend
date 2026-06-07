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
  Code2,
  ExternalLink,
  Github,
  Lightbulb,
  PenTool,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { IconButton } from '@mui/material';
import ExpandableText from '../../components/fellowship/ExpandableText';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import LinkChip from '../../components/fellowship/LinkChip';
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
import fellowshipService from '../../services/fellowshipService';
import { extractErrorMessage } from '../../utils/errorUtils';
import {
  EMPTY_PROPOSAL_FIELDS as EMPTY_FIELDS,
  duplicateLinkIndices,
  githubProfileUrl,
  normalizeGithub,
  parseProposal,
  serializeProposal,
  validateGithub,
  validateLink,
  type ProposalFields,
} from '../../utils/proposalFormat';

// X/Twitter-style long-form limit per section — mirrored server-side.
const LONG_TEXT_LIMIT = 3000;
// Titles surface in list rows, dialog headers and the print view —
// long enough to be descriptive, short enough to stay scannable.
const TITLE_LIMIT = 120;

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

  const loadedApp = useApplication(activeId ?? '', { enabled: !!activeId });
  const loadedProposal = useApplicationProposal(activeId ?? '', { enabled: !!activeId });

  const createMut = useCreateApplication();
  const updateMut = useUpdateApplication();
  const submitMut = useSubmitApplication();
  const deleteMut = useDeleteApplication();

  useEffect(() => {
    if (appIdFromUrl && appIdFromUrl !== activeId) setActiveId(appIdFromUrl);
  }, [appIdFromUrl, activeId]);

  // Hydrate the editor from a saved draft exactly once per application. Re-parsing
  // on every refetch (e.g. after a save) would clobber the user's in-progress edits.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeId) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === activeId) return;
    if (loadedProposal.data?.proposal !== undefined) {
      setFields(parseProposal(loadedProposal.data.proposal));
      hydratedFor.current = activeId;
    }
  }, [activeId, loadedProposal.data?.proposal]);

  useEffect(() => {
    if (activeId && loadedApp.data?.type) setSelectedType(loadedApp.data.type);
  }, [activeId, loadedApp.data?.type]);

  const currentApp = activeId ? loadedApp.data : null;
  const isEditable =
    !activeId ||
    currentApp?.status === FellowshipApplicationStatus.DRAFT ||
    currentApp?.status === FellowshipApplicationStatus.CHANGES_REQUESTED;
  const isResubmit = currentApp?.status === FellowshipApplicationStatus.CHANGES_REQUESTED;

  const dupLinkIndices = useMemo(
    () => duplicateLinkIndices(fields.links),
    [fields.links],
  );

  // Advisory GitHub account check — a missing account warns but never blocks.
  const [githubCheck, setGithubCheck] = useState<{
    handle: string;
    exists: boolean | null;
  } | null>(null);

  const handleGithubBlur = () => {
    if (validateGithub(fields.github)) return;
    const handle = normalizeGithub(fields.github);
    if (!handle) {
      setGithubCheck(null);
      return;
    }
    // Canonicalize whatever form was typed (URL, @handle) to the bare username.
    if (handle !== fields.github) setField('github', handle);
    if (githubCheck?.handle === handle) return;
    fellowshipService
      .checkGithubUser(handle)
      .then((res) => setGithubCheck({ handle, exists: res.exists }))
      .catch(() => setGithubCheck({ handle, exists: null }));
  };

  const githubWarning =
    githubCheck &&
    githubCheck.exists === false &&
    normalizeGithub(fields.github) === githubCheck.handle
      ? `GitHub user "${githubCheck.handle}" was not found — double-check the username.`
      : null;

  const proposalReady = useMemo(() => {
    if (fields.problemStatement.trim().length === 0) return false;
    if (fields.plan.trim().length === 0) return false;
    if (validateGithub(fields.github)) return false;
    if (fields.links.some((l) => validateLink(l))) return false;
    if (dupLinkIndices.size > 0) return false;
    return true;
  }, [fields.problemStatement, fields.plan, fields.github, fields.links, dupLinkIndices]);

  const resetEditor = () => {
    setActiveId(null);
    setFields(EMPTY_FIELDS);
    setSelectedType(null);
    setStep(0);
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
      // Reflect the draft in the URL so a refresh resumes this draft instead
      // of starting a fresh editor (which would then collide with the
      // one-draft-per-type rule on the next save).
      searchParams.set('appId', created.id);
      setSearchParams(searchParams, { replace: true });
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
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const id = await ensureDraftExists();
        if (id) setToast({ kind: 'success', msg: 'Draft created.' });
      }
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleContinueFromTrack = () => {
    if (!selectedType) return;
    // No draft is created here — a draft only exists once the user explicitly
    // clicks "Save draft" (or submits). This keeps phantom drafts from appearing.
    setStep(1);
  };

  const handleContinueFromProposal = async () => {
    if (!proposalReady) return;
    // Persist before moving to review so progress survives a refresh —
    // create the draft on first Continue, update it afterwards.
    if (isEditable && selectedType) {
      try {
        if (activeId) {
          await updateMut.mutateAsync({
            id: activeId,
            body: { proposal: serializeProposal(fields) },
          });
        } else {
          const id = await ensureDraftExists();
          if (!id) return; // creation failed — toast already shown
        }
      } catch (e) {
        setToast({ kind: 'error', msg: extractErrorMessage(e) });
        return;
      }
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedType) return;
    try {
      // Create the application on submit if the user never saved a draft;
      // otherwise persist the latest edits before submitting.
      let id = activeId;
      if (id) {
        await updateMut.mutateAsync({
          id,
          body: { proposal: serializeProposal(fields) },
        });
      } else {
        id = await ensureDraftExists();
        if (!id) return;
      }
      await submitMut.mutateAsync({ id });
      setToast({
        kind: 'success',
        msg: isResubmit
          ? 'Application resubmitted — check your email.'
          : 'Application submitted — check your email.',
      });
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
          // Jumping to review goes through the same save-then-advance path
          // as the Continue button.
          if (i === 2 && selectedType && proposalReady) void handleContinueFromProposal();
        }}
      />

      {step === 0 && (
        <TrackStep
          selectedType={selectedType}
          disabled={!isEditable}
          onSelect={setSelectedType}
          onContinue={handleContinueFromTrack}
        />
      )}

      {step === 1 && (
        <ProposalStep
          fields={fields}
          disabled={!isEditable}
          onChange={setField}
          onBack={() => setStep(0)}
          onSaveDraft={handleSaveDraft}
          onContinue={handleContinueFromProposal}
          isSaving={updateMut.isPending || createMut.isPending}
          canContinue={proposalReady}
          showDiscard={!!activeId && isEditable}
          onDiscard={handleDiscard}
          isDiscarding={deleteMut.isPending}
          dupLinkIndices={dupLinkIndices}
          onGithubBlur={handleGithubBlur}
          githubWarning={githubWarning}
        />
      )}

      {step === 2 && selectedType && (
        <ReviewStep
          track={TRACK_BY_VALUE[selectedType]}
          fields={fields}
          reviewerRemarks={isResubmit ? currentApp?.reviewerRemarks ?? null : null}
          onBack={() => setStep(1)}
          onSubmit={handleSubmit}
          isSubmitting={submitMut.isPending || updateMut.isPending}
          canSubmit={isEditable && proposalReady && !submitMut.isPending}
          submitLabel={isResubmit ? 'Resubmit application' : 'Submit application'}
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
  onContinue,
}: {
  selectedType: FellowshipType | null;
  disabled: boolean;
  onSelect: (t: FellowshipType) => void;
  onContinue: () => void;
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
        <Button
          variant="contained"
          onClick={onContinue}
          disabled={!selectedType || disabled}
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
  onChange,
  onBack,
  onSaveDraft,
  onContinue,
  isSaving,
  canContinue,
  showDiscard,
  onDiscard,
  isDiscarding,
  dupLinkIndices,
  onGithubBlur,
  githubWarning,
}: {
  fields: ProposalFields;
  disabled: boolean;
  onChange: <K extends keyof ProposalFields>(k: K, v: ProposalFields[K]) => void;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  isSaving: boolean;
  canContinue: boolean;
  showDiscard: boolean;
  onDiscard: () => void;
  isDiscarding: boolean;
  dupLinkIndices: Set<number>;
  onGithubBlur: () => void;
  githubWarning: string | null;
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
          slotProps={{ htmlInput: { maxLength: TITLE_LIMIT } }}
          helperText={<CharCount value={fields.title} limit={TITLE_LIMIT} />}
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
          slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
          helperText={<CharCount value={fields.problemStatement} />}
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
          slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
          helperText={<CharCount value={fields.plan} />}
          sx={{ mb: 2.5 }}
        />

        <FieldLabel>GitHub username</FieldLabel>
        <TextField
          fullWidth
          value={fields.github}
          onChange={(e) => onChange('github', e.target.value)}
          onBlur={onGithubBlur}
          disabled={disabled}
          placeholder="aarav-m or https://github.com/aarav-m"
          error={!!validateGithub(fields.github)}
          helperText={validateGithub(fields.github) ?? ' '}
          sx={{ mb: githubWarning ? 0 : 2 }}
        />
        {githubWarning && (
          <Typography
            variant="caption"
            sx={{ color: 'warning.main', display: 'block', mb: 2 }}
          >
            {githubWarning}
          </Typography>
        )}

        <FieldLabel>Links (portfolio, LinkedIn, prior work)</FieldLabel>
        <Stack spacing={1.25} sx={{ mb: 1 }}>
          {fields.links.map((link, idx) => {
            const error =
              validateLink(link) ??
              (dupLinkIndices.has(idx) ? 'Duplicate link — already added above.' : null);
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
          disabled={disabled}
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
              disabled={!canContinue || disabled || isSaving}
              endIcon={<ArrowRight size={16} />}
            >
              {isSaving ? 'Saving…' : 'Continue'}
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

// Live character counter rendered as helperText under length-capped fields.
const CharCount = ({ value, limit = LONG_TEXT_LIMIT }: { value: string; limit?: number }) => (
  <Box
    component="span"
    sx={{
      display: 'block',
      textAlign: 'right',
      color: value.length >= limit ? 'warning.main' : 'text.secondary',
    }}
  >
    {value.length.toLocaleString('en-US')} / {limit.toLocaleString('en-US')}
  </Box>
);

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
  reviewerRemarks,
  onBack,
  onSubmit,
  isSubmitting,
  canSubmit,
  submitLabel,
}: {
  track: TrackOption;
  fields: ProposalFields;
  reviewerRemarks: string | null;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  submitLabel: string;
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

      {reviewerRemarks && (
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          <strong>Reviewer feedback:</strong> {reviewerRemarks}
        </Alert>
      )}

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
          {fields.problemStatement ? (
            <ExpandableText text={fields.problemStatement} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              —
            </Typography>
          )}
        </Box>

        <Box>
          <FieldLabel>6-month plan & milestones</FieldLabel>
          {fields.plan ? (
            <ExpandableText text={fields.plan} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              —
            </Typography>
          )}
        </Box>

        <Box>
          <FieldLabel>GitHub username</FieldLabel>
          {fields.github ? (
            <LinkChip
              href={githubProfileUrl(fields.github)}
              icon={<Github size={13} />}
              label={`@${normalizeGithub(fields.github)}`}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              —
            </Typography>
          )}
        </Box>
        <Box>
          <FieldLabel>Links</FieldLabel>
          {fields.links.filter((l) => l.trim()).length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              —
            </Typography>
          ) : (
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 1 }}>
              {fields.links
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => (
                  <LinkChip
                    key={l}
                    href={l.startsWith('http') ? l : `https://${l}`}
                    icon={<ExternalLink size={13} />}
                    label={l.replace(/^https?:\/\//, '')}
                  />
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
          {isSubmitting ? 'Submitting…' : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
};

export default Apply;
