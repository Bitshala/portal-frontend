import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Plus, Trash2, X } from 'lucide-react';
import FellowshipPageLayout from '../../components/fellowship/FellowshipPageLayout';
import MarkdownView from '../../components/fellowship/MarkdownView';
import ReportReflections from '../../components/fellowship/ReportReflections';
import StatusChip from '../../components/fellowship/StatusChip';
import {
  useCreateReport,
  useDeleteReport,
  useFellowship,
  useMyFellowships,
  useReport,
  useReportContent,
  useSubmitReport,
  useUpdateReport,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipReportStatus,
  FellowshipStatus,
  type GetFellowshipResponseDto,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';
import { formatFellowshipType } from '../../utils/fellowshipFormat';
import {
  CHAR_LIMIT,
  MAX_LINKS,
  REFLECTIVE_QUESTIONS,
  type ReflectiveField,
  cleanLinks,
  countChars,
  findDuplicateLinkIndices,
  isValidGithubLink,
} from '../../utils/reportContent';
import { useFellowshipProjectTitle } from '../../hooks/useFellowshipProjectTitle';

type ReflectiveAnswers = Record<ReflectiveField, string>;

const EMPTY_REFLECTIVE: ReflectiveAnswers = {
  challengingWork: '',
  keyLearning: '',
  reviewerFeedback: '',
  growthGoal: '',
};

// Label for a fellowship in the picker: project name (from the proposal) with
// the track in parens, falling back to just the track when there's no title.
const FellowshipOptionLabel = ({ fellowship }: { fellowship: GetFellowshipResponseDto }) => {
  const title = useFellowshipProjectTitle(fellowship);
  const track = formatFellowshipType(fellowship.type);
  return <>{title ? `${title} (${track})` : track}</>;
};

const monthName = (m: number) =>
  new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });

const Report = () => {
  const { fellowshipId: routeFellowshipId, id: reportIdParam } = useParams<{
    fellowshipId: string;
    id?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const creatingNew = !reportIdParam || reportIdParam === 'new';
  const reportId = creatingNew ? null : reportIdParam!;

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // The fellowship a new report is filed against — seeded from the URL but
  // changeable via the dropdown, so a fellow with several can pick one.
  const [selectedFellowshipId, setSelectedFellowshipId] = useState<string>(routeFellowshipId ?? '');
  useEffect(() => {
    if (routeFellowshipId) setSelectedFellowshipId(routeFellowshipId);
  }, [routeFellowshipId]);
  const fellowshipId = selectedFellowshipId;

  const initialMonth = Number(searchParams.get('month')) || currentMonth;
  const [month, setMonth] = useState<number>(initialMonth);
  const [summary, setSummary] = useState('');
  const [reflective, setReflective] = useState<ReflectiveAnswers>(EMPTY_REFLECTIVE);
  const [prLinks, setPrLinks] = useState<string[]>(['']);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  // Submitting is irreversible (locks the report for review), so confirm first.
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  // Set once the fellow tries to submit, so empty required fields can show inline
  // "<field> is required" errors without nagging on a pristine form.
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const fellowshipsQuery = useMyFellowships({ page: 0, pageSize: 50 });
  // Reports can only be filed against an active fellowship.
  const fellowshipOptions = useMemo(
    () =>
      (fellowshipsQuery.data?.records ?? []).filter(
        (f) => f.status === FellowshipStatus.ACTIVE,
      ),
    [fellowshipsQuery.data?.records],
  );

  const { data: fellowship } = useFellowship(fellowshipId, { enabled: !!fellowshipId });
  const fellowshipTitle = useFellowshipProjectTitle(fellowship);
  const report = useReport(reportId ?? '', { enabled: !!reportId });
  const reportContent = useReportContent(reportId ?? '', {
    enabled: !!reportId,
  });
  const createMut = useCreateReport();
  const updateMut = useUpdateReport();
  const submitMut = useSubmitReport();
  const deleteMut = useDeleteReport();

  useEffect(() => {
    const data = reportContent.data;
    if (!data) return;
    setPrLinks(data.links.length ? data.links : ['']);
    setSummary(data.summary);
    setReflective({
      challengingWork: data.challengingWork,
      keyLearning: data.keyLearning,
      reviewerFeedback: data.reviewerFeedback,
      growthGoal: data.growthGoal,
    });
  }, [reportContent.data]);

  useEffect(() => {
    if (report.data) setMonth(report.data.month);
  }, [report.data]);

  // Selectable months run from the fellowship's start month up to the current
  // month (you can file the current month in advance); reports can't predate the
  // contract. Year is always the current year, so it isn't a separate field.
  const monthOptions = useMemo(() => {
    const start = fellowship?.startDate ? new Date(fellowship.startDate) : null;
    const startMonth =
      start && start.getFullYear() === currentYear ? start.getMonth() + 1 : 1;
    const lo = Math.min(startMonth, currentMonth);
    const opts: { value: number; label: string }[] = [];
    for (let m = lo; m <= currentMonth; m++) opts.push({ value: m, label: monthName(m) });
    return opts.length ? opts : [{ value: currentMonth, label: monthName(currentMonth) }];
  }, [fellowship?.startDate, currentMonth, currentYear]);

  // Keep the selected month within the allowed range when creating.
  useEffect(() => {
    if (creatingNew && !monthOptions.some((o) => o.value === month)) {
      setMonth(monthOptions[monthOptions.length - 1].value);
    }
  }, [monthOptions, creatingNew, month]);

  const current = reportId ? report.data : null;
  const isEditable = !reportId || current?.status === FellowshipReportStatus.DRAFT;
  // New reports always belong to the current year; existing ones keep their own.
  const year = current?.year ?? currentYear;

  // Submission is only allowed while the fellowship is active.
  const fellowshipActive = fellowship?.status === FellowshipStatus.ACTIVE;
  // The cap is a character count and applies to the summary and each reflective
  // answer independently.
  const summaryChars = countChars(summary);
  const summaryOverLimit = summaryChars > CHAR_LIMIT;
  const reflectiveOverLimit = REFLECTIVE_QUESTIONS.some(
    (q) => countChars(reflective[q.field]) > CHAR_LIMIT,
  );
  const anyOverLimit = summaryOverLimit || reflectiveOverLimit;
  // Links are optional, but any provided must be a valid GitHub PR/issue URL.
  const allLinksValid = prLinks.every((l) => !l.trim() || isValidGithubLink(l));
  // The same PR/issue link must not be listed twice.
  const duplicateLinkIndices = useMemo(() => findDuplicateLinkIndices(prLinks), [prLinks]);
  const hasDuplicateLinks = duplicateLinkIndices.size > 0;
  // At most MAX_LINKS links may be attached.
  const nonEmptyLinkCount = prLinks.filter((l) => l.trim()).length;
  const tooManyLinks = nonEmptyLinkCount > MAX_LINKS;
  // Summary and all four reflective answers are required on submit.
  const summaryMissing = !summary.trim();
  const missingReflective = REFLECTIVE_QUESTIONS.filter((q) => !reflective[q.field].trim());
  // Structural problems (over-limit, bad/duplicate/too-many links) surface their
  // own inline errors and hard-disable Submit. Empty required fields don't disable
  // it — clicking reveals which fields still need filling (see handleSubmit).
  const hasStructuralError =
    anyOverLimit || !allLinksValid || hasDuplicateLinks || tooManyLinks;
  const submitBlocked =
    !isEditable || !fellowshipId || !fellowshipActive || hasStructuralError;

  const updateLink = (index: number, value: string) =>
    setPrLinks((prev) => prev.map((l, i) => (i === index ? value : l)));
  const addLink = () => setPrLinks((prev) => [...prev, '']);
  const removeLink = (index: number) =>
    setPrLinks((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));
  const updateReflective = (field: ReflectiveField, value: string) =>
    setReflective((prev) => ({ ...prev, [field]: value }));

  // The structured body sent on create/update. Links are de-duped and stripped
  // of blanks; the reflective answers round-trip as-is (empty when unanswered).
  const buildBody = () => ({
    summary,
    links: cleanLinks(prLinks),
    challengingWork: reflective.challengingWork,
    keyLearning: reflective.keyLearning,
    reviewerFeedback: reflective.reviewerFeedback,
    growthGoal: reflective.growthGoal,
  });

  const handleSaveDraft = async () => {
    if (!fellowshipId || !summary.trim()) return;
    if (!fellowshipActive) {
      setToast({ kind: 'error', msg: 'Reports can only be filed for an active fellowship.' });
      return;
    }
    if (anyOverLimit) {
      setToast({ kind: 'error', msg: `Each field is limited to ${CHAR_LIMIT} characters.` });
      return;
    }
    // Links are optional while drafting, but any provided must be valid and unique.
    if (!allLinksValid) {
      setToast({ kind: 'error', msg: 'Enter valid GitHub pull request or issue links.' });
      return;
    }
    if (hasDuplicateLinks) {
      setToast({ kind: 'error', msg: 'Remove duplicate links — each PR/issue can only be added once.' });
      return;
    }
    if (tooManyLinks) {
      setToast({ kind: 'error', msg: `Add at most ${MAX_LINKS} links.` });
      return;
    }
    try {
      if (reportId) {
        await updateMut.mutateAsync({ id: reportId, body: buildBody() });
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const created = await createMut.mutateAsync({
          fellowshipId,
          month,
          year: currentYear,
          ...buildBody(),
        });
        setToast({ kind: 'success', msg: 'Draft created.' });
        navigate(`/fellowship/fellowships/${fellowshipId}/reports/${created.id}`, {
          replace: true,
        });
      }
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    if (!fellowshipId) return;
    if (!fellowshipActive) {
      setToast({ kind: 'error', msg: 'Reports can only be submitted for an active fellowship.' });
      return;
    }
    if (summaryMissing) {
      setToast({ kind: 'error', msg: 'Summary is required.' });
      return;
    }
    if (missingReflective.length > 0) {
      setToast({ kind: 'error', msg: `${missingReflective[0].label} is required.` });
      return;
    }
    if (anyOverLimit) {
      setToast({ kind: 'error', msg: `Each field is limited to ${CHAR_LIMIT} characters.` });
      return;
    }
    // Links aren't required to submit, but any provided must be valid and unique.
    if (!allLinksValid) {
      setToast({ kind: 'error', msg: 'Enter valid GitHub pull request or issue links.' });
      return;
    }
    if (hasDuplicateLinks) {
      setToast({ kind: 'error', msg: 'Remove duplicate links — each PR/issue can only be added once.' });
      return;
    }
    if (tooManyLinks) {
      setToast({ kind: 'error', msg: `Add at most ${MAX_LINKS} links.` });
      return;
    }
    try {
      let id = reportId;
      if (!id) {
        const created = await createMut.mutateAsync({
          fellowshipId,
          month,
          year: currentYear,
          ...buildBody(),
        });
        id = created.id;
        navigate(`/fellowship/fellowships/${fellowshipId}/reports/${id}`, { replace: true });
      } else {
        await updateMut.mutateAsync({ id, body: buildBody() });
      }
      await submitMut.mutateAsync({ id });
      setToast({ kind: 'success', msg: 'Submitted for review.' });
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  const handleDelete = async () => {
    if (!reportId) return;
    if (!confirm('Delete this draft?')) return;
    try {
      await deleteMut.mutateAsync({ id: reportId });
      setToast({ kind: 'success', msg: 'Draft deleted.' });
      navigate('/fellowship/reports');
    } catch (e) {
      setToast({ kind: 'error', msg: extractErrorMessage(e) });
    }
  };

  return (
    <FellowshipPageLayout>
      {toast && (
        <Alert severity={toast.kind} sx={{ mb: 2 }} onClose={() => setToast(null)}>
          {toast.msg}
        </Alert>
      )}

      <Button variant="text" size="small" onClick={() => navigate('/fellowship/reports')} sx={{ mb: 2 }}>
        ← Back to reports
      </Button>

      <Card variant="outlined" sx={{ borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                    {fellowshipTitle
                      ? `${fellowshipTitle}${fellowship ? ` (${formatFellowshipType(fellowship.type)})` : ''}`
                      : fellowship
                        ? formatFellowshipType(fellowship.type)
                        : 'Fellowship'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {monthName(month)} {year}
                  </Typography>
                </Box>
                {current && <StatusChip status={current.status} />}
              </Stack>

              {creatingNew && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    select
                    label="Fellowship"
                    value={fellowshipOptions.some((f) => f.id === fellowshipId) ? fellowshipId : ''}
                    onChange={(e) => setSelectedFellowshipId(e.target.value)}
                    size="small"
                    sx={{ minWidth: 220 }}
                  >
                    {fellowshipOptions.length === 0 && (
                      <MenuItem value="" disabled>
                        No active fellowships
                      </MenuItem>
                    )}
                    {fellowshipOptions.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        <FellowshipOptionLabel fellowship={f} />
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    size="small"
                    sx={{ minWidth: 160 }}
                  >
                    {monthOptions.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
              )}

              {current?.status === FellowshipReportStatus.REJECTED && current.reviewerRemarks && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <strong>Reviewer remarks:</strong> {current.reviewerRemarks}
                </Alert>
              )}

              {isEditable && fellowship && !fellowshipActive && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Reports can only be submitted while your fellowship is active.
                </Alert>
              )}

              {isEditable ? (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Pull request / issue links
                    </Typography>
                    <Stack spacing={1.5}>
                      {prLinks.map((link, i) => {
                        const invalid = !!link.trim() && !isValidGithubLink(link);
                        const duplicate = duplicateLinkIndices.has(i);
                        return (
                          <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                            <TextField
                              fullWidth
                              placeholder="https://github.com/owner/repo/pull/123"
                              value={link}
                              onChange={(e) => updateLink(i, e.target.value)}
                              disabled={!!reportId && reportContent.isLoading}
                              error={invalid || duplicate}
                              helperText={
                                invalid
                                  ? 'Enter a valid GitHub pull request or issue link.'
                                  : duplicate
                                    ? 'This link has already been added.'
                                    : ' '
                              }
                            />
                            <IconButton
                              aria-label="Remove link"
                              onClick={() => removeLink(i)}
                              disabled={prLinks.length <= 1 && !link.trim()}
                              sx={{ mt: 0.5 }}
                            >
                              <X size={16} />
                            </IconButton>
                          </Stack>
                        );
                      })}
                    </Stack>
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<Plus size={16} />}
                      onClick={addLink}
                      disabled={
                        !prLinks.every((l) => isValidGithubLink(l)) || nonEmptyLinkCount >= MAX_LINKS
                      }
                      sx={{ mt: 0.5 }}
                    >
                      Add another link
                    </Button>
                    {tooManyLinks && (
                      <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>
                        Add at most {MAX_LINKS} links.
                      </Typography>
                    )}
                  </Box>

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Monthly summary
                  </Typography>
                  <TextField
                    multiline
                    fullWidth
                    minRows={12}
                    maxRows={24}
                    placeholder="Please share a summary of everything you worked on this month — highlights, relevant features, code/documentation/blog links, etc. Markdown supported."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    disabled={!!reportId && reportContent.isLoading}
                    error={summaryOverLimit || (submitAttempted && summaryMissing)}
                    helperText={
                      submitAttempted && summaryMissing ? (
                        'Summary is required.'
                      ) : (
                        <Box component="span" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {summaryChars} / {CHAR_LIMIT} characters
                        </Box>
                      )
                    }
                  />

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Reflections
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Share a few sentences for each — all four are required to submit.
                    </Typography>
                    <Stack spacing={3}>
                      {REFLECTIVE_QUESTIONS.map((q) => {
                        const value = reflective[q.field];
                        const chars = countChars(value);
                        const missing = submitAttempted && !value.trim();
                        return (
                          <Box key={q.field}>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                              {q.prompt}
                            </Typography>
                            <TextField
                              multiline
                              fullWidth
                              minRows={4}
                              maxRows={16}
                              value={value}
                              onChange={(e) => updateReflective(q.field, e.target.value)}
                              disabled={!!reportId && reportContent.isLoading}
                              error={chars > CHAR_LIMIT || missing}
                              helperText={
                                missing ? (
                                  `${q.label} is required.`
                                ) : (
                                  <Box component="span" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {chars} / {CHAR_LIMIT} characters
                                  </Box>
                                )
                              }
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={handleSaveDraft}
                      disabled={
                        !fellowshipId ||
                        !fellowshipActive ||
                        !summary.trim() ||
                        anyOverLimit ||
                        createMut.isPending ||
                        updateMut.isPending
                      }
                    >
                      {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save draft'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => {
                        setSubmitAttempted(true);
                        if (summaryMissing) {
                          setToast({ kind: 'error', msg: 'Summary is required.' });
                          return;
                        }
                        if (missingReflective.length > 0) {
                          setToast({ kind: 'error', msg: `${missingReflective[0].label} is required.` });
                          return;
                        }
                        setConfirmSubmitOpen(true);
                      }}
                      disabled={
                        submitBlocked ||
                        submitMut.isPending ||
                        createMut.isPending ||
                        updateMut.isPending
                      }
                    >
                      {submitMut.isPending ? 'Submitting…' : 'Submit'}
                    </Button>
                    {reportId && (
                      <Button variant="text" color="error" startIcon={<Trash2 size={16} />} onClick={handleDelete}>
                        Delete draft
                      </Button>
                    )}
                  </Stack>
                </>
              ) : reportContent.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={22} />
                </Box>
              ) : (
                <>
                  {prLinks.filter((l) => l.trim()).length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        Pull request / issue links
                      </Typography>
                      <Stack spacing={0.5}>
                        {prLinks
                          .filter((l) => l.trim())
                          .map((link, i) => (
                            <Link
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ wordBreak: 'break-all', fontSize: '0.88rem' }}
                            >
                              {link}
                            </Link>
                          ))}
                      </Stack>
                    </Box>
                  )}
                  {summary.trim() ? (
                    <MarkdownView content={summary} />
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      This report has no content.
                    </Typography>
                  )}
                  {reportContent.data && <ReportReflections content={reportContent.data} />}
                </>
              )}
            </CardContent>
          </Card>

      <Dialog
        open={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Submit report for review?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Once submitted, this report is locked and sent for review — you won't be able to
            edit it. Make sure your links and write-up are complete before continuing.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setConfirmSubmitOpen(false)} disabled={submitMut.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setConfirmSubmitOpen(false);
              void handleSubmit();
            }}
            disabled={submitMut.isPending || createMut.isPending || updateMut.isPending}
          >
            {submitMut.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </FellowshipPageLayout>
  );
};

export default Report;
