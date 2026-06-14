import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormReturn,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  type TextFieldProps,
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
  useMyApplications,
  useSubmitApplication,
  useUpdateApplication,
} from '../../hooks/fellowshipHooks';
import { useUser } from '../../hooks/userHooks';
import {
  FellowshipApplicationStatus,
  FellowshipType,
  type FellowshipApplicationProposalWriteDto,
} from '../../types/fellowship';
import fellowshipService from '../../services/fellowshipService';
import { extractErrorMessage } from '../../utils/errorUtils';
import {
  EMPTY_PROPOSAL_FIELDS as EMPTY_FIELDS,
  buildProposalBody,
  duplicateLinkIndices,
  githubProfileUrl,
  normalizeGithub,
  proposalDtoToFields,
  validateGithub,
  validateLink,
  type ProposalFields,
} from '../../utils/proposalFormat';

// X/Twitter-style long-form limit per section — mirrored server-side.
const LONG_TEXT_LIMIT = 3000;
// Titles surface in list rows, dialog headers and the print view —
// long enough to be descriptive, short enough to stay scannable.
const TITLE_LIMIT = 120;
// Per-link cap and link-count cap. Together with the section caps these keep the
// serialized payload comfortably under the server's 20,000-char ceiling, so the
// overall limit can't be tripped from the UI.
const LINK_LIMIT = 500;
const MAX_LINKS = 20;
// Free-text location (profile field), per-entry cap and count cap for the
// multi-value chip fields (domains, coding languages, education interests).
const LOCATION_LIMIT = 255;
const TAG_LIMIT = 100;
const MAX_TAGS = 50;
// Graduation year bounds — mirrored server-side.
const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

// ---- Validation schema (react-hook-form + zod) ----

const longText = () =>
  z
    .string()
    .max(LONG_TEXT_LIMIT, { message: `Keep this under ${LONG_TEXT_LIMIT.toLocaleString('en-US')} characters.` });

const requiredLongText = (label: string) => longText().refine((v) => v.trim().length > 0, { message: `${label} is required.` });

// Multi-value tag field: each entry capped, total count capped. Required-ness is
// branched per track in superRefine so non-empty checks can depend on the track.
const tagArray = () =>
  z
    .array(z.string().max(TAG_LIMIT, { message: `Keep each entry under ${TAG_LIMIT} characters.` }))
    .max(MAX_TAGS, { message: `Add at most ${MAX_TAGS} entries.` });

// Several fields are required only on the Developer track (github, project
// details, coding languages); everything else is shared. The schema is built
// per-track so non-developer applicants aren't blocked on developer-only fields.
const makeApplicationSchema = (isDeveloper: boolean) =>
  z
    .object({
      // Proposal
      title: z
        .string()
        .trim()
        .min(1, { message: 'Project title is required.' })
        .max(TITLE_LIMIT, { message: `Keep the title under ${TITLE_LIMIT} characters.` }),
      problemStatement: requiredLongText('Problem statement'),
      plan: requiredLongText('6-month plan'),
      links: z
        .array(
          z
            .string()
            .max(LINK_LIMIT, { message: 'This link is too long.' })
            .refine((l) => !validateLink(l), {
              message: 'Enter a full URL starting with http:// or https://',
            }),
        )
        .max(MAX_LINKS, { message: `Add at most ${MAX_LINKS} links.` }),
      // Mentor
      mentorName: z
        .string()
        .trim()
        .min(1, { message: 'Mentor name is required.' })
        .max(TITLE_LIMIT, { message: `Keep this under ${TITLE_LIMIT} characters.` }),
      mentorContact: z
        .string()
        .trim()
        .min(1, { message: 'Mentor contact is required.' })
        .max(TITLE_LIMIT, { message: `Keep this under ${TITLE_LIMIT} characters.` }),
      mentorTestimonial: longText(),
      // Project (developer track)
      github: z.string(),
      projectName: z
        .string()
        .max(TITLE_LIMIT, { message: `Keep this under ${TITLE_LIMIT} characters.` }),
      projectGithubLink: z
        .string()
        .max(LINK_LIMIT, { message: 'This link is too long.' }),
      // About you
      location: z
        .string()
        .max(LOCATION_LIMIT, { message: `Keep this under ${LOCATION_LIMIT} characters.` }),
      academicBackground: requiredLongText('Academic background'),
      graduationYear: z.string(),
      professionalExperience: requiredLongText('Professional experience'),
      domains: tagArray(),
      codingLanguages: tagArray(),
      educationInterests: tagArray(),
      // Bitcoin
      bitcoinContributions: requiredLongText('Bitcoin contributions'),
      bitcoinMotivation: requiredLongText('Bitcoin motivation'),
      bitcoinOssGoal: requiredLongText('Bitcoin OSS goal'),
      // Anything else
      additionalInfo: longText(),
      questionsForBitshala: longText(),
    })
    .superRefine((data, ctx) => {
      const gh = data.github.trim();
      if (isDeveloper && normalizeGithub(gh).length === 0) {
        ctx.addIssue({ code: 'custom', path: ['github'], message: 'GitHub username is required.' });
      } else {
        const ghError = validateGithub(gh);
        if (ghError) ctx.addIssue({ code: 'custom', path: ['github'], message: ghError });
      }

      // Cross-field check: flag links that duplicate an earlier one.
      for (const i of duplicateLinkIndices(data.links)) {
        ctx.addIssue({ code: 'custom', path: ['links', i], message: 'Duplicate link — already added above.' });
      }

      // Graduation year — required for every track, must be a whole year in range.
      const year = data.graduationYear.trim();
      if (!year) {
        ctx.addIssue({ code: 'custom', path: ['graduationYear'], message: 'Graduation year is required.' });
      } else if (!/^\d{4}$/.test(year) || Number(year) < YEAR_MIN || Number(year) > YEAR_MAX) {
        ctx.addIssue({
          code: 'custom',
          path: ['graduationYear'],
          message: `Enter a year between ${YEAR_MIN} and ${YEAR_MAX}.`,
        });
      }

      // Required-on-submit multi-value fields.
      if (data.domains.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['domains'], message: 'Add at least one domain.' });
      }
      if (data.educationInterests.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['educationInterests'], message: 'Add at least one interest.' });
      }

      // Developer-only required fields.
      if (isDeveloper) {
        if (!data.projectName.trim()) {
          ctx.addIssue({ code: 'custom', path: ['projectName'], message: 'Project name is required.' });
        }
        if (!data.projectGithubLink.trim()) {
          ctx.addIssue({ code: 'custom', path: ['projectGithubLink'], message: 'Project GitHub link is required.' });
        } else if (validateLink(data.projectGithubLink)) {
          ctx.addIssue({
            code: 'custom',
            path: ['projectGithubLink'],
            message: 'Enter a full URL starting with http:// or https://',
          });
        }
        if (data.codingLanguages.length === 0) {
          ctx.addIssue({ code: 'custom', path: ['codingLanguages'], message: 'Add at least one language.' });
        }
      } else if (data.projectGithubLink.trim() && validateLink(data.projectGithubLink)) {
        // Non-developer tracks: project link is optional but still format-checked.
        ctx.addIssue({
          code: 'custom',
          path: ['projectGithubLink'],
          message: 'Enter a full URL starting with http:// or https://',
        });
      }
    });

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

// 0 is the Track step, the middle indices are the editing steps (one per
// EDIT_STEPS entry) and the last index is Review.
type StepIndex = number;

// Result of the advisory GitHub account check. 'checking' is in-flight;
// 'unknown' is the null case (rate-limited / unreachable), distinct from 'missing'.
type GithubCheckStatus = 'checking' | 'exists' | 'missing' | 'unknown';

// A category card rendered inside an editing step.
type SectionKey = 'proposal' | 'mentor' | 'project' | 'about' | 'bitcoin' | 'anythingElse';

// The editing steps between Track and Review. Each owns a set of section cards
// and the form fields validated when the applicant clicks Continue on it
// (developer-only fields are folded in per track). Splitting the long combined
// form across these keeps each step short and scannable.
const EDIT_STEPS: {
  label: string;
  sections: SectionKey[];
  fields: (isDeveloper: boolean) => (keyof ProposalFields)[];
}[] = [
  {
    label: 'Proposal',
    sections: ['proposal', 'mentor', 'project'],
    fields: (isDeveloper) => {
      const f: (keyof ProposalFields)[] = [
        'title',
        'problemStatement',
        'plan',
        'links',
        'mentorName',
        'mentorContact',
        'mentorTestimonial',
      ];
      if (isDeveloper) f.push('projectName', 'projectGithubLink', 'github');
      return f;
    },
  },
  {
    label: 'About you',
    sections: ['about'],
    fields: (isDeveloper) => {
      const f: (keyof ProposalFields)[] = [
        'location',
        'graduationYear',
        'academicBackground',
        'professionalExperience',
        'domains',
        'educationInterests',
      ];
      // GitHub lives in the Project card on the Developer track, otherwise here.
      f.push(isDeveloper ? 'codingLanguages' : 'github');
      return f;
    },
  },
  {
    label: 'Bitcoin',
    sections: ['bitcoin', 'anythingElse'],
    fields: () => [
      'bitcoinContributions',
      'bitcoinMotivation',
      'bitcoinOssGoal',
      'additionalInfo',
      'questionsForBitshala',
    ],
  },
];

const STEP_LABELS = ['Track', ...EDIT_STEPS.map((s) => s.label), 'Review & submit'];
const TOTAL_STEPS = STEP_LABELS.length;
const REVIEW_STEP = TOTAL_STEPS - 1;

const Apply = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const appIdFromUrl = searchParams.get('appId');

  const [selectedType, setSelectedType] = useState<FellowshipType | null>(null);
  const [activeId, setActiveId] = useState<string | null>(appIdFromUrl);
  const [step, setStep] = useState<StepIndex>(0);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // The Developer track requires GitHub, the project fields and coding
  // languages; Designer/Educator leave those optional (GitHub is still
  // format-checked when provided).
  const isDeveloper = selectedType === FellowshipType.DEVELOPER;

  const resolver = useMemo(() => zodResolver(makeApplicationSchema(isDeveloper)), [isDeveloper]);
  const form = useForm<ProposalFields>({
    resolver,
    defaultValues: EMPTY_FIELDS,
    // Validate on blur, then keep errors fresh as the user types to clear them.
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });
  const { control, getValues, setValue, reset } = form;

  // Live values drive autosave, the GitHub check and the review preview.
  const values = useWatch({ control }) as ProposalFields;
  // Stable serialization of the request body — drives autosave change detection.
  const draftBodyKey = useMemo(() => JSON.stringify(buildProposalBody(values)), [values]);

  const loadedApp = useApplication(activeId ?? '', { enabled: !!activeId });
  const loadedProposal = useApplicationProposal(activeId ?? '', { enabled: !!activeId });
  const myApplicationsQuery = useMyApplications({ page: 0, pageSize: 20 });
  // `location` is a profile field, not stored on the application — prefill it
  // from the fellow's profile and write it back through on submit.
  const profileQuery = useUser();

  const createMut = useCreateApplication();
  const updateMut = useUpdateApplication();
  const submitMut = useSubmitApplication();
  const deleteMut = useDeleteApplication();

  useEffect(() => {
    if (!submitted) return;
    // Land back on My Applications — the fellowship pages only appear once an
    // application is accepted, so sending a fresh submission there is confusing.
    const timer = setTimeout(() => navigate('/fellowship/applications', { replace: true }), 1800);
    return () => clearTimeout(timer);
  }, [navigate, submitted]);

  useEffect(() => {
    if (appIdFromUrl && appIdFromUrl !== activeId) setActiveId(appIdFromUrl);
  }, [appIdFromUrl, activeId]);

  // Hydrate the editor from a saved draft exactly once per application. Re-parsing
  // on every refetch (e.g. after a save) would clobber the user's in-progress edits.
  const hydratedFor = useRef<string | null>(null);
  const openedEditorFor = useRef<string | null>(null);
  const lastSavedRef = useRef<{ id: string; key: string } | null>(null);
  const locationSeededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeId) {
      hydratedFor.current = null;
      openedEditorFor.current = null;
      return;
    }
    if (hydratedFor.current === activeId) return;
    if (loadedProposal.data) {
      const parsed = proposalDtoToFields(loadedProposal.data);
      reset(parsed);
      hydratedFor.current = activeId;
      // Seed the autosave baseline so hydration doesn't trigger a redundant save.
      lastSavedRef.current = { id: activeId, key: JSON.stringify(buildProposalBody(parsed)) };
    }
  }, [activeId, loadedProposal.data, reset]);

  // Prefill the location field from the fellow's profile once, when the profile
  // loads and the user hasn't typed one. Keyed per editor so switching drafts
  // re-seeds. Only fills a blank field, so it never clobbers an edit in progress.
  useEffect(() => {
    if (!profileQuery.data) return;
    if (activeId && hydratedFor.current !== activeId) return; // wait for hydration
    const key = activeId ?? 'new';
    if (locationSeededFor.current === key) return;
    locationSeededFor.current = key;
    if (!getValues('location') && profileQuery.data.location) {
      setValue('location', profileQuery.data.location);
    }
  }, [profileQuery.data, activeId, getValues, setValue]);

  useEffect(() => {
    if (!activeId || !loadedApp.data?.type) return;
    setSelectedType(loadedApp.data.type);
    if (
      openedEditorFor.current !== activeId &&
      (loadedApp.data.status === FellowshipApplicationStatus.DRAFT ||
        loadedApp.data.status === FellowshipApplicationStatus.CHANGES_REQUESTED)
    ) {
      setStep(1);
      openedEditorFor.current = activeId;
    }
  }, [activeId, loadedApp.data?.type, loadedApp.data?.status]);

  const existingSameTypeApp = useMemo(() => {
    if (!selectedType) return null;
    const sameType = (myApplicationsQuery.data?.records ?? []).filter(
      (a) => a.type === selectedType,
    );
    return (
      sameType.find(
        (a) =>
          a.status === FellowshipApplicationStatus.DRAFT ||
          a.status === FellowshipApplicationStatus.CHANGES_REQUESTED,
      ) ??
      sameType.find((a) => a.status === FellowshipApplicationStatus.SUBMITTED) ??
      null
    );
  }, [myApplicationsQuery.data?.records, selectedType]);

  useEffect(() => {
    if (activeId || !selectedType || myApplicationsQuery.isLoading) return;
    if (
      existingSameTypeApp?.status === FellowshipApplicationStatus.DRAFT ||
      existingSameTypeApp?.status === FellowshipApplicationStatus.CHANGES_REQUESTED
    ) {
      setActiveId(existingSameTypeApp.id);
      searchParams.set('appId', existingSameTypeApp.id);
      setSearchParams(searchParams, { replace: true });
      setStep(1);
    }
  }, [
    activeId,
    existingSameTypeApp,
    myApplicationsQuery.isLoading,
    searchParams,
    selectedType,
    setSearchParams,
  ]);

  const currentApp = activeId ? loadedApp.data : null;
  const isEditable =
    !activeId ||
    currentApp?.status === FellowshipApplicationStatus.DRAFT ||
    currentApp?.status === FellowshipApplicationStatus.CHANGES_REQUESTED;
  const isResubmit = currentApp?.status === FellowshipApplicationStatus.CHANGES_REQUESTED;

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveInFlight = useRef(false);

  useEffect(() => {
    if (submitted) return;
    if (!selectedType || !isEditable) return;
    if (!activeId && existingSameTypeApp) return;
    if (activeId && !currentApp) return;
    if (autoSaveInFlight.current) return;
    if (lastSavedRef.current?.id === activeId && lastSavedRef.current.key === draftBodyKey) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void (async () => {
        autoSaveInFlight.current = true;
        const body = buildProposalBody(getValues());
        const key = JSON.stringify(body);
        try {
          if (activeId) {
            await updateMut.mutateAsync({ id: activeId, body });
            lastSavedRef.current = { id: activeId, key };
          } else {
            const created = await createMut.mutateAsync({ type: selectedType, ...body });
            setActiveId(created.id);
            searchParams.set('appId', created.id);
            setSearchParams(searchParams, { replace: true });
            lastSavedRef.current = { id: created.id, key };
          }
        } catch (e) {
          setToast({ kind: 'error', msg: extractErrorMessage(e) });
        } finally {
          autoSaveInFlight.current = false;
        }
      })();
    }, 1000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [
    activeId,
    currentApp,
    existingSameTypeApp,
    isEditable,
    submitted,
    searchParams,
    selectedType,
    draftBodyKey,
    getValues,
    setSearchParams,
    createMut,
    updateMut,
  ]);

  // Advisory GitHub account check — strictly informational, it never blocks
  // submission. Three outcomes map to three states: the account exists, GitHub
  // confirmed it's missing (false), or the check couldn't run (null → unknown).
  const [githubCheck, setGithubCheck] = useState<{
    handle: string;
    status: GithubCheckStatus;
  } | null>(null);

  const handleGithubBlur = () => {
    const raw = getValues('github');
    if (validateGithub(raw)) return;
    const handle = normalizeGithub(raw);
    if (!handle) {
      setGithubCheck(null);
      return;
    }
    // Canonicalize whatever form was typed (URL, @handle) to the bare username.
    if (handle !== raw) setValue('github', handle, { shouldValidate: true });
    // Already have a settled result for this exact handle — don't re-hit the API.
    if (githubCheck?.handle === handle && githubCheck.status !== 'checking') return;
    setGithubCheck({ handle, status: 'checking' });
    fellowshipService
      .checkGithubUser(handle)
      .then((res) =>
        setGithubCheck({
          handle,
          // null is "couldn't verify", NOT "missing" — keep them distinct.
          status: res.exists === true ? 'exists' : res.exists === false ? 'missing' : 'unknown',
        }),
      )
      .catch(() => setGithubCheck({ handle, status: 'unknown' }));
  };

  // Only surface the result while it still matches what's in the field, so an
  // edit after the check clears a now-stale indicator.
  const githubStatus =
    githubCheck && normalizeGithub(values.github ?? '') === githubCheck.handle
      ? githubCheck.status
      : null;

  const resetEditor = () => {
    lastSavedRef.current = null;
    openedEditorFor.current = null;
    hydratedFor.current = null;
    locationSeededFor.current = null;
    setActiveId(null);
    reset(EMPTY_FIELDS);
    setSelectedType(null);
    setStep(0);
    if (searchParams.has('appId')) {
      searchParams.delete('appId');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Create the draft if it doesn't exist yet, otherwise update it. Returns the
  // application id, or null if creation failed / is blocked.
  const persistDraft = async (
    body: FellowshipApplicationProposalWriteDto,
  ): Promise<string | null> => {
    const key = JSON.stringify(body);
    if (activeId) {
      await updateMut.mutateAsync({ id: activeId, body });
      lastSavedRef.current = { id: activeId, key };
      return activeId;
    }
    if (!selectedType) return null;
    if (
      existingSameTypeApp?.status === FellowshipApplicationStatus.DRAFT ||
      existingSameTypeApp?.status === FellowshipApplicationStatus.CHANGES_REQUESTED
    ) {
      setActiveId(existingSameTypeApp.id);
      searchParams.set('appId', existingSameTypeApp.id);
      setSearchParams(searchParams, { replace: true });
      await updateMut.mutateAsync({ id: existingSameTypeApp.id, body });
      lastSavedRef.current = { id: existingSameTypeApp.id, key };
      return existingSameTypeApp.id;
    }
    if (existingSameTypeApp?.status === FellowshipApplicationStatus.SUBMITTED) {
      navigate('/fellowship/applications', { replace: true });
      return null;
    }
    const created = await createMut.mutateAsync({ type: selectedType, ...body });
    lastSavedRef.current = { id: created.id, key };
    setActiveId(created.id);
    // Reflect the draft in the URL so a refresh resumes this draft instead of
    // starting a fresh editor (which would collide with the one-draft-per-type rule).
    searchParams.set('appId', created.id);
    setSearchParams(searchParams, { replace: true });
    return created.id;
  };

  // Save draft skips validation — drafts are allowed to be incomplete.
  const handleSaveDraft = async () => {
    if (!selectedType) return;
    try {
      const id = await persistDraft(buildProposalBody(getValues()));
      if (id) setToast({ kind: 'success', msg: 'Draft saved.' });
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const trackBlockedMessage =
    existingSameTypeApp?.status === FellowshipApplicationStatus.SUBMITTED && selectedType
      ? `You already have a ${TRACK_BY_VALUE[selectedType].title.toLowerCase()} fellowship under review.`
      : null;

  const handleContinueFromTrack = () => {
    if (!selectedType || trackBlockedMessage) return;
    setStep(1);
  };

  // Persist the current draft (if editable) and move to the given step. Bails
  // without advancing if the save fails or is blocked.
  const persistThenGoTo = async (nextStep: number): Promise<void> => {
    if (isEditable && selectedType) {
      try {
        const id = await persistDraft(buildProposalBody(getValues()));
        if (!id) return; // creation failed / blocked — toast already shown
      } catch (e) {
        setToast({ kind: 'error', msg: extractErrorMessage(e) });
        return;
      }
    }
    setStep(nextStep);
  };

  // Continue on an intermediate editing step validates only that step's fields
  // (full validation is deferred to the Review/submit transition), then advances.
  const handleContinueEdit = (currentStep: number) => async () => {
    const ok = await form.trigger(EDIT_STEPS[currentStep - 1].fields(isDeveloper));
    if (!ok) return;
    await persistThenGoTo(currentStep + 1);
  };

  // When validation fails on the way to Review or on submit, jump to the first
  // editing step that owns an errored field so the applicant can see it.
  const handleInvalid = (errors: FieldErrors<ProposalFields>) => {
    const idx = EDIT_STEPS.findIndex((s) =>
      s.fields(isDeveloper).some((f) => errors[f]),
    );
    setStep(idx >= 0 ? idx + 1 : 1);
    setToast({ kind: 'error', msg: 'Please fix the highlighted fields before continuing.' });
  };

  // Leaving the last editing step (or jumping to Review) runs full validation.
  const handleGoToReview = form.handleSubmit(
    () => persistThenGoTo(REVIEW_STEP),
    handleInvalid,
  );

  // Final submit goes through the same full validation, then submits for review.
  const handleSubmit = form.handleSubmit(async () => {
    if (!selectedType) return;
    try {
      const id = await persistDraft(buildProposalBody(getValues()));
      if (!id) return;
      await submitMut.mutateAsync({ id });
      resetEditor();
      setSubmitted(true);
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  }, handleInvalid);

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

  if (submitted) {
    return (
      <FellowshipPageLayout
        title="Application submitted"
        subtitle="Your proposal has been sent for review."
        hideIcon
      >
        <SubmissionSuccess />
      </FellowshipPageLayout>
    );
  }

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
          if (i === step) return;
          if (i === 0) {
            setStep(0);
            return;
          }
          if (!selectedType) return;
          // Editing steps are freely navigable; jumping to Review validates all.
          if (i <= EDIT_STEPS.length) setStep(i);
          else void handleGoToReview();
        }}
      />

      {step === 0 && (
        <TrackStep
          selectedType={selectedType}
          disabled={!isEditable}
          onSelect={setSelectedType}
          onContinue={handleContinueFromTrack}
          blockedMessage={trackBlockedMessage}
        />
      )}

      {step >= 1 && step <= EDIT_STEPS.length && selectedType && (
        <ApplicationStep
          form={form}
          disabled={!isEditable}
          sections={EDIT_STEPS[step - 1].sections}
          stepNumber={step + 1}
          isLastEditStep={step === EDIT_STEPS.length}
          onBack={() => setStep(step - 1)}
          onSaveDraft={handleSaveDraft}
          onContinue={step === EDIT_STEPS.length ? handleGoToReview : handleContinueEdit(step)}
          isSaving={updateMut.isPending || createMut.isPending}
          showDiscard={!!activeId && isEditable}
          onDiscard={handleDiscard}
          isDiscarding={deleteMut.isPending}
          onGithubBlur={handleGithubBlur}
          githubStatus={githubStatus}
          isDeveloper={isDeveloper}
        />
      )}

      {step === REVIEW_STEP && selectedType && (
        <ReviewStep
          track={TRACK_BY_VALUE[selectedType]}
          fields={values}
          isDeveloper={isDeveloper}
          reviewerRemarks={isResubmit ? currentApp?.reviewerRemarks ?? null : null}
          onBack={() => setStep(EDIT_STEPS.length)}
          onSubmit={handleSubmit}
          isSubmitting={submitMut.isPending || updateMut.isPending}
          isSubmitDisabled={!isEditable || submitMut.isPending}
          submitLabel={isResubmit ? 'Resubmit application' : 'Submit application'}
        />
      )}
    </FellowshipPageLayout>
  );
};

const SubmissionSuccess = () => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'rgba(74,222,128,0.35)',
      borderRadius: 0.75,
      bgcolor: 'rgba(74,222,128,0.08)',
      p: { xs: 3, md: 5 },
      textAlign: 'center',
    }}
  >
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        bgcolor: 'rgba(74,222,128,0.14)',
        color: '#4ade80',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 2,
      }}
    >
      <CheckCircle2 size={30} />
    </Box>
    <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
      Application submitted successfully
    </Typography>
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
      <CircularProgress size={16} sx={{ color: '#4ade80' }} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        You are being redirected to My Applications.
      </Typography>
    </Stack>
  </Box>
);

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
  blockedMessage,
}: {
  selectedType: FellowshipType | null;
  disabled: boolean;
  onSelect: (t: FellowshipType) => void;
  onContinue: () => void;
  blockedMessage: string | null;
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
        STEP 1 OF {TOTAL_STEPS}
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="flex-end" alignItems={{ xs: 'stretch', sm: 'center' }}>
        {blockedMessage && (
          <Alert severity="info" sx={{ mr: { sm: 'auto' } }}>
            {blockedMessage}
          </Alert>
        )}
        <Button
          variant="contained"
          onClick={onContinue}
          disabled={!selectedType || disabled || !!blockedMessage}
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

// Fields bound directly to a single string value in the form.
type TextFieldName =
  | 'title'
  | 'problemStatement'
  | 'plan'
  | 'mentorName'
  | 'mentorContact'
  | 'mentorTestimonial'
  | 'projectName'
  | 'projectGithubLink'
  | 'location'
  | 'academicBackground'
  | 'graduationYear'
  | 'professionalExperience'
  | 'bitcoinContributions'
  | 'bitcoinMotivation'
  | 'bitcoinOssGoal'
  | 'additionalInfo'
  | 'questionsForBitshala';

// Multi-value chip fields.
type TagFieldName = 'domains' | 'codingLanguages' | 'educationInterests';

// A react-hook-form Controller wrapped around an MUI TextField. Shows the
// field's validation error, or a character counter / fallback helper text.
const ControlledTextField = ({
  control,
  name,
  counter,
  counterLimit = LONG_TEXT_LIMIT,
  helperText,
  ...textFieldProps
}: {
  control: Control<ProposalFields>;
  name: TextFieldName;
  counter?: boolean;
  counterLimit?: number;
} & Omit<TextFieldProps, 'name' | 'value' | 'error' | 'onChange' | 'onBlur'>) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <TextField
        {...textFieldProps}
        name={field.name}
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        inputRef={field.ref}
        error={!!fieldState.error}
        helperText={
          fieldState.error?.message ??
          (counter ? <CharCount value={String(field.value ?? '')} limit={counterLimit} /> : helperText ?? ' ')
        }
      />
    )}
  />
);

// A multi-value chip input (domains / coding languages / education interests).
// Free-text entries are added on Enter, trimmed, de-blanked and count-capped.
const ControlledChips = ({
  control,
  name,
  disabled,
  placeholder,
}: {
  control: Control<ProposalFields>;
  name: TagFieldName;
  disabled?: boolean;
  placeholder?: string;
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => {
      const values = (field.value as string[] | undefined) ?? [];
      return (
        <Autocomplete
          multiple
          freeSolo
          disableClearable
          options={[] as string[]}
          value={values}
          disabled={disabled}
          onChange={(_, next) =>
            field.onChange(
              (next as string[]).map((s) => s.trim()).filter(Boolean).slice(0, MAX_TAGS),
            )
          }
          onBlur={field.onBlur}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...tagProps } = getTagProps({ index });
              return <Chip key={key} label={option} size="small" {...tagProps} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={field.ref}
              placeholder={values.length ? '' : placeholder}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
            />
          )}
        />
      );
    }}
  />
);

// A grouped section of the application form, rendered as its own card so the
// combined form reads as clear categories rather than one long list.
const SectionCard = ({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 0.75,
      bgcolor: 'background.paper',
      p: { xs: 2.5, md: 3.5 },
    }}
  >
    <Typography variant="h6" sx={{ fontWeight: 700, mb: caption ? 0.5 : 2.5 }}>
      {title}
    </Typography>
    {caption && (
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        {caption}
      </Typography>
    )}
    {children}
  </Box>
);

const ApplicationStep = ({
  form,
  disabled,
  sections,
  stepNumber,
  isLastEditStep,
  onBack,
  onSaveDraft,
  onContinue,
  isSaving,
  showDiscard,
  onDiscard,
  isDiscarding,
  onGithubBlur,
  githubStatus,
  isDeveloper,
}: {
  form: UseFormReturn<ProposalFields>;
  disabled: boolean;
  /** Which category cards this step renders. */
  sections: SectionKey[];
  /** 1-based position in the full stepper (Track is step 1). */
  stepNumber: number;
  /** The last editing step continues to Review rather than another edit step. */
  isLastEditStep: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  isSaving: boolean;
  showDiscard: boolean;
  onDiscard: () => void;
  isDiscarding: boolean;
  onGithubBlur: () => void;
  githubStatus: GithubCheckStatus | null;
  isDeveloper: boolean;
}) => {
  const { control, getValues, setValue, formState } = form;
  const links = (useWatch({ control, name: 'links' }) as string[] | undefined) ?? [''];
  const linksArrayError =
    typeof formState.errors.links?.message === 'string' ? formState.errors.links.message : null;

  const addLink = () =>
    setValue('links', [...getValues('links'), ''], { shouldDirty: true });
  const removeLink = (idx: number) => {
    const next = getValues('links').filter((_, i) => i !== idx);
    setValue('links', next.length ? next : [''], { shouldDirty: true, shouldValidate: true });
  };

  const optionalSuffix = isDeveloper ? '' : ' (optional)';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 280px' },
        gap: 2.5,
        alignItems: 'start',
      }}
    >
      <Stack spacing={2.5}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
        >
          STEP {stepNumber} OF {TOTAL_STEPS}
        </Typography>

        {/* ---- Proposal ---- */}
        {sections.includes('proposal') && (
        <SectionCard title="Proposal">
          <FieldLabel>Project title</FieldLabel>
          <ControlledTextField
            control={control}
            name="title"
            counter
            counterLimit={TITLE_LIMIT}
            fullWidth
            disabled={disabled}
            placeholder="BIP-324 transport relay — large-scale fuzz testing harness"
            slotProps={{ htmlInput: { maxLength: TITLE_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Problem statement</FieldLabel>
          <ControlledTextField
            control={control}
            name="problemStatement"
            counter
            fullWidth
            multiline
            minRows={4}
            disabled={disabled}
            placeholder="What gap are you closing, and why does it matter for the ecosystem? Link to the relevant issues, RFCs, or discussions."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>6-month plan & milestones</FieldLabel>
          <ControlledTextField
            control={control}
            name="plan"
            counter
            fullWidth
            multiline
            minRows={6}
            disabled={disabled}
            placeholder={`Month 1–2: scope, prior-art review, first PR\nMonth 3–4: core implementation, tests\nMonth 5–6: integration, docs, handoff`}
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Links (portfolio, LinkedIn, prior work)</FieldLabel>
          <Stack spacing={1.25} sx={{ mb: 1 }}>
            {links.map((_, idx) => {
              const showRemove = links.length > 1;
              return (
                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                  <Controller
                    control={control}
                    name={`links.${idx}`}
                    render={({ field, fieldState }) => (
                      <TextField
                        fullWidth
                        name={field.name}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        inputRef={field.ref}
                        disabled={disabled}
                        placeholder="https://linkedin.com/in/aarav-m"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message ?? ' '}
                      />
                    )}
                  />
                  {showRemove && !disabled && (
                    <IconButton
                      aria-label="Remove link"
                      onClick={() => removeLink(idx)}
                      sx={{ mt: 0.5, color: 'text.secondary' }}
                    >
                      <X size={16} />
                    </IconButton>
                  )}
                </Stack>
              );
            })}
          </Stack>
          {linksArrayError && (
            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mb: 1 }}>
              {linksArrayError}
            </Typography>
          )}
          <Button
            size="small"
            variant="text"
            startIcon={<Plus size={14} />}
            disabled={disabled || links.length >= MAX_LINKS}
            onClick={addLink}
            sx={{ alignSelf: 'flex-start' }}
          >
            Add another link
          </Button>
        </SectionCard>
        )}

        {/* ---- Mentor ---- */}
        {sections.includes('mentor') && (
        <SectionCard title="Mentor">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 2 }}>
            <Box sx={{ flex: 1 }}>
              <FieldLabel>Mentor name</FieldLabel>
              <ControlledTextField
                control={control}
                name="mentorName"
                fullWidth
                disabled={disabled}
                placeholder="Satoshi Rao"
                slotProps={{ htmlInput: { maxLength: TITLE_LIMIT } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel>Mentor contact</FieldLabel>
              <ControlledTextField
                control={control}
                name="mentorContact"
                fullWidth
                disabled={disabled}
                placeholder="Email, Telegram or Discord"
                slotProps={{ htmlInput: { maxLength: TITLE_LIMIT } }}
              />
            </Box>
          </Stack>

          <FieldLabel>Mentor testimonial (optional)</FieldLabel>
          <ControlledTextField
            control={control}
            name="mentorTestimonial"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="A short note from your mentor on your work and why they back this proposal."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
          />
        </SectionCard>
        )}

        {/* ---- Project (developer track) ---- */}
        {sections.includes('project') && isDeveloper && (
          <SectionCard title="Project" caption="Tell us about the open-source project you'll work on.">
            <FieldLabel>Project name</FieldLabel>
            <ControlledTextField
              control={control}
              name="projectName"
              fullWidth
              disabled={disabled}
              placeholder="Bitcoin Core"
              slotProps={{ htmlInput: { maxLength: TITLE_LIMIT } }}
              sx={{ mb: 2.5 }}
            />

            <FieldLabel>Project GitHub link</FieldLabel>
            <ControlledTextField
              control={control}
              name="projectGithubLink"
              fullWidth
              disabled={disabled}
              placeholder="https://github.com/bitcoin/bitcoin"
              slotProps={{ htmlInput: { maxLength: LINK_LIMIT } }}
              sx={{ mb: 2.5 }}
            />

            <FieldLabel>Your GitHub username</FieldLabel>
            <Controller
              control={control}
              name="github"
              render={({ field, fieldState }) => (
                <TextField
                  fullWidth
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={() => {
                    field.onBlur();
                    onGithubBlur();
                  }}
                  inputRef={field.ref}
                  disabled={disabled}
                  placeholder="aarav-m or https://github.com/aarav-m"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ?? ' '}
                  sx={{ mb: githubStatus ? 0 : 0.5 }}
                />
              )}
            />
            <GithubCheckHint status={githubStatus} />
          </SectionCard>
        )}

        {/* ---- About you ---- */}
        {sections.includes('about') && (
        <SectionCard title="About you">
          {!isDeveloper && (
            <>
              <FieldLabel>GitHub username (optional)</FieldLabel>
              <Controller
                control={control}
                name="github"
                render={({ field, fieldState }) => (
                  <TextField
                    fullWidth
                    name={field.name}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={() => {
                      field.onBlur();
                      onGithubBlur();
                    }}
                    inputRef={field.ref}
                    disabled={disabled}
                    placeholder="aarav-m or https://github.com/aarav-m"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? ' '}
                    sx={{ mb: githubStatus ? 0 : 0.5 }}
                  />
                )}
              />
              <GithubCheckHint status={githubStatus} />
            </>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 2 }}>
            <Box sx={{ flex: 2 }}>
              <FieldLabel>Location (optional)</FieldLabel>
              <ControlledTextField
                control={control}
                name="location"
                fullWidth
                disabled={disabled}
                placeholder="Bengaluru, India"
                helperText="Saved to your profile."
                slotProps={{ htmlInput: { maxLength: LOCATION_LIMIT } }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <FieldLabel>Graduation year</FieldLabel>
              <ControlledTextField
                control={control}
                name="graduationYear"
                fullWidth
                disabled={disabled}
                placeholder="2024"
                slotProps={{ htmlInput: { maxLength: 4, inputMode: 'numeric' } }}
              />
            </Box>
          </Stack>

          <FieldLabel>Academic background</FieldLabel>
          <ControlledTextField
            control={control}
            name="academicBackground"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="Degrees, institutions, relevant coursework."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Professional experience</FieldLabel>
          <ControlledTextField
            control={control}
            name="professionalExperience"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="Roles, companies, open-source work, notable projects."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Domains</FieldLabel>
          <ControlledChips
            control={control}
            name="domains"
            disabled={disabled}
            placeholder="Type a domain and press Enter (e.g. consensus, P2P)"
          />

          {isDeveloper && (
            <>
              <FieldLabel>Coding languages</FieldLabel>
              <ControlledChips
                control={control}
                name="codingLanguages"
                disabled={disabled}
                placeholder="Type a language and press Enter (e.g. C++, Rust)"
              />
            </>
          )}

          <FieldLabel>Education interests</FieldLabel>
          <ControlledChips
            control={control}
            name="educationInterests"
            disabled={disabled}
            placeholder="Type an interest and press Enter (e.g. mining, privacy)"
          />
        </SectionCard>
        )}

        {/* ---- Bitcoin ---- */}
        {sections.includes('bitcoin') && (
        <SectionCard title="Bitcoin">
          <FieldLabel>Bitcoin contributions</FieldLabel>
          <ControlledTextField
            control={control}
            name="bitcoinContributions"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="PRs, reviews, writing, events — what you've done in the Bitcoin space."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Bitcoin motivation</FieldLabel>
          <ControlledTextField
            control={control}
            name="bitcoinMotivation"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="Why Bitcoin, and why now?"
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Bitcoin OSS goal</FieldLabel>
          <ControlledTextField
            control={control}
            name="bitcoinOssGoal"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="What do you want to achieve in Bitcoin open-source over the fellowship and beyond?"
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
          />
        </SectionCard>
        )}

        {/* ---- Anything else ---- */}
        {sections.includes('anythingElse') && (
        <SectionCard title="Anything else">
          <FieldLabel>Additional info{optionalSuffix}</FieldLabel>
          <ControlledTextField
            control={control}
            name="additionalInfo"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="Anything else you'd like the reviewers to know."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
            sx={{ mb: 2.5 }}
          />

          <FieldLabel>Questions for Bitshala{optionalSuffix}</FieldLabel>
          <ControlledTextField
            control={control}
            name="questionsForBitshala"
            counter
            fullWidth
            multiline
            minRows={3}
            disabled={disabled}
            placeholder="Anything you'd like to ask us."
            slotProps={{ htmlInput: { maxLength: LONG_TEXT_LIMIT } }}
          />
        </SectionCard>
        )}

        {/* ---- Actions ---- */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
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
              disabled={disabled || isSaving}
              endIcon={<ArrowRight size={16} />}
            >
              {isSaving ? 'Saving…' : isLastEditStep ? 'Review' : 'Continue'}
            </Button>
          </Stack>
        </Stack>
      </Stack>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: { md: 'sticky' }, top: { md: 16 } }}>
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

// Advisory GitHub indicator — purely informational, shown under the username
// field. Renders nothing until the field has been checked. A missing/unknown
// result is a gentle nudge, never a blocker on submission.
const GithubCheckHint = ({ status }: { status: GithubCheckStatus | null }) => {
  if (!status) return null;
  const common = { display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 } as const;
  if (status === 'checking') {
    return (
      <Box sx={{ ...common, color: 'text.secondary' }}>
        <CircularProgress size={12} sx={{ color: 'text.secondary' }} />
        <Typography variant="caption">Checking GitHub…</Typography>
      </Box>
    );
  }
  if (status === 'exists') {
    return (
      <Box sx={{ ...common, color: 'success.main' }}>
        <CheckCircle2 size={13} />
        <Typography variant="caption">GitHub account found.</Typography>
      </Box>
    );
  }
  if (status === 'missing') {
    return (
      <Typography variant="caption" sx={{ ...common, color: 'warning.main' }}>
        We couldn't find this GitHub account — double-check the username.
      </Typography>
    );
  }
  // unknown — the check couldn't run (rate limit / network). Stay neutral.
  return (
    <Typography variant="caption" sx={{ ...common, color: 'text.secondary' }}>
      Couldn't verify GitHub right now — you can still submit.
    </Typography>
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

const Dash = () => (
  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
    —
  </Typography>
);

// A group heading separating one review category from the next.
const ReviewGroupLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="caption"
    sx={{
      color: 'text.primary',
      fontWeight: 700,
      letterSpacing: 0.6,
      display: 'block',
      pt: 1,
      borderTop: '1px solid',
      borderColor: 'divider',
    }}
  >
    {children}
  </Typography>
);

const ReviewText = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <FieldLabel>{label}</FieldLabel>
    {value.trim() ? <Typography>{value}</Typography> : <Dash />}
  </Box>
);

const ReviewLong = ({ label, text }: { label: string; text: string }) => (
  <Box>
    <FieldLabel>{label}</FieldLabel>
    {text.trim() ? <ExpandableText text={text} /> : <Dash />}
  </Box>
);

const ReviewChips = ({ label, values }: { label: string; values: string[] }) => (
  <Box>
    <FieldLabel>{label}</FieldLabel>
    {values.length === 0 ? (
      <Dash />
    ) : (
      <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
        {values.map((v) => (
          <Chip key={v} label={v} size="small" />
        ))}
      </Stack>
    )}
  </Box>
);

const ReviewStep = ({
  track,
  fields,
  isDeveloper,
  reviewerRemarks,
  onBack,
  onSubmit,
  isSubmitting,
  isSubmitDisabled,
  submitLabel,
}: {
  track: TrackOption;
  fields: ProposalFields;
  isDeveloper: boolean;
  reviewerRemarks: string | null;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  submitLabel: string;
}) => {
  const links = fields.links.map((l) => l.trim()).filter(Boolean);
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
        STEP {TOTAL_STEPS} OF {TOTAL_STEPS}
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
          <Typography sx={{ fontWeight: 600 }}>{track.title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {track.description}
          </Typography>
        </Box>

        <ReviewGroupLabel>Proposal</ReviewGroupLabel>
        <ReviewText label="Project title" value={fields.title} />
        <ReviewLong label="Problem statement" text={fields.problemStatement} />
        <ReviewLong label="6-month plan & milestones" text={fields.plan} />
        <Box>
          <FieldLabel>Links</FieldLabel>
          {links.length === 0 ? (
            <Dash />
          ) : (
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ rowGap: 1 }}>
              {links.map((l) => (
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

        <ReviewGroupLabel>Mentor</ReviewGroupLabel>
        <Box>
          <FieldLabel>Mentor</FieldLabel>
          {fields.mentorName || fields.mentorContact ? (
            <>
              <Typography>
                {fields.mentorName || '—'}
                {fields.mentorContact && (
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {' '}
                    · {fields.mentorContact}
                  </Box>
                )}
              </Typography>
              {fields.mentorTestimonial && (
                <Box sx={{ mt: 1 }}>
                  <ExpandableText text={fields.mentorTestimonial} />
                </Box>
              )}
            </>
          ) : (
            <Dash />
          )}
        </Box>

        {isDeveloper && (
          <>
            <ReviewGroupLabel>Project</ReviewGroupLabel>
            <ReviewText label="Project name" value={fields.projectName} />
            <Box>
              <FieldLabel>Project GitHub link</FieldLabel>
              {fields.projectGithubLink.trim() ? (
                <LinkChip
                  href={fields.projectGithubLink}
                  icon={<Github size={13} />}
                  label={fields.projectGithubLink.replace(/^https?:\/\//, '')}
                />
              ) : (
                <Dash />
              )}
            </Box>
          </>
        )}

        <ReviewGroupLabel>About you</ReviewGroupLabel>
        <Box>
          <FieldLabel>GitHub username</FieldLabel>
          {fields.github ? (
            <LinkChip
              href={githubProfileUrl(fields.github)}
              icon={<Github size={13} />}
              label={`@${normalizeGithub(fields.github)}`}
            />
          ) : (
            <Dash />
          )}
        </Box>
        <ReviewText label="Location" value={fields.location} />
        <ReviewText label="Graduation year" value={fields.graduationYear} />
        <ReviewLong label="Academic background" text={fields.academicBackground} />
        <ReviewLong label="Professional experience" text={fields.professionalExperience} />
        <ReviewChips label="Domains" values={fields.domains} />
        {isDeveloper && <ReviewChips label="Coding languages" values={fields.codingLanguages} />}
        <ReviewChips label="Education interests" values={fields.educationInterests} />

        <ReviewGroupLabel>Bitcoin</ReviewGroupLabel>
        <ReviewLong label="Bitcoin contributions" text={fields.bitcoinContributions} />
        <ReviewLong label="Bitcoin motivation" text={fields.bitcoinMotivation} />
        <ReviewLong label="Bitcoin OSS goal" text={fields.bitcoinOssGoal} />

        {(fields.additionalInfo.trim() || fields.questionsForBitshala.trim()) && (
          <>
            <ReviewGroupLabel>Anything else</ReviewGroupLabel>
            {fields.additionalInfo.trim() && (
              <ReviewLong label="Additional info" text={fields.additionalInfo} />
            )}
            {fields.questionsForBitshala.trim() && (
              <ReviewLong label="Questions for Bitshala" text={fields.questionsForBitshala} />
            )}
          </>
        )}
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
        <Button variant="contained" onClick={onSubmit} disabled={isSubmitDisabled}>
          {isSubmitting ? 'Submitting…' : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
};

export default Apply;
