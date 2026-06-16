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
  WORD_LIMIT,
  composeReportContent,
  countWords,
  findDuplicateLinkIndices,
  isValidGithubLink,
  parseReportContent,
} from '../../utils/reportContent';
import { useFellowshipProjectTitle } from '../../hooks/useFellowshipProjectTitle';

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
  const [content, setContent] = useState('');
  const [prLinks, setPrLinks] = useState<string[]>(['']);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  // Submitting is irreversible (locks the report for review), so confirm first.
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

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
    if (reportContent.data?.content !== undefined) {
      const { links, body } = parseReportContent(reportContent.data.content);
      setPrLinks(links);
      setContent(body);
    }
  }, [reportContent.data?.content]);

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
  const wordCount = useMemo(() => countWords(content), [content]);
  const overWordLimit = wordCount > WORD_LIMIT;
  // Every non-empty link must be valid; submission needs at least one.
  const allLinksValid = prLinks.every((l) => !l.trim() || isValidGithubLink(l));
  const validLinks = prLinks.filter((l) => isValidGithubLink(l));
  const hasValidLink = validLinks.length > 0 && allLinksValid;
  // The same PR/issue link must not be listed twice.
  const duplicateLinkIndices = useMemo(() => findDuplicateLinkIndices(prLinks), [prLinks]);
  const hasDuplicateLinks = duplicateLinkIndices.size > 0;
  const canSubmit =
    isEditable &&
    !!fellowshipId &&
    fellowshipActive &&
    !!content.trim() &&
    !overWordLimit &&
    hasValidLink &&
    !hasDuplicateLinks;

  const updateLink = (index: number, value: string) =>
    setPrLinks((prev) => prev.map((l, i) => (i === index ? value : l)));
  const addLink = () => setPrLinks((prev) => [...prev, '']);
  const removeLink = (index: number) =>
    setPrLinks((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)));

  const handleSaveDraft = async () => {
    if (!fellowshipId || !content.trim()) return;
    if (!fellowshipActive) {
      setToast({ kind: 'error', msg: 'Reports can only be filed for an active fellowship.' });
      return;
    }
    if (overWordLimit) {
      setToast({ kind: 'error', msg: `Reports are limited to ${WORD_LIMIT} words.` });
      return;
    }
    // Links are optional while drafting, but any provided must be valid.
    if (!allLinksValid) {
      setToast({ kind: 'error', msg: 'Enter valid GitHub pull request or issue links.' });
      return;
    }
    if (hasDuplicateLinks) {
      setToast({ kind: 'error', msg: 'Remove duplicate links — each PR/issue can only be added once.' });
      return;
    }
    const composed = composeReportContent(prLinks, content);
    try {
      if (reportId) {
        await updateMut.mutateAsync({ id: reportId, body: { content: composed } });
        setToast({ kind: 'success', msg: 'Draft saved.' });
      } else {
        const created = await createMut.mutateAsync({ fellowshipId, month, year: currentYear, content: composed });
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
    if (!content.trim() || !fellowshipId) return;
    if (!fellowshipActive) {
      setToast({ kind: 'error', msg: 'Reports can only be submitted for an active fellowship.' });
      return;
    }
    if (overWordLimit) {
      setToast({ kind: 'error', msg: `Reports are limited to ${WORD_LIMIT} words.` });
      return;
    }
    if (!hasValidLink) {
      setToast({ kind: 'error', msg: 'Add at least one valid GitHub pull request or issue link.' });
      return;
    }
    if (hasDuplicateLinks) {
      setToast({ kind: 'error', msg: 'Remove duplicate links — each PR/issue can only be added once.' });
      return;
    }
    const composed = composeReportContent(prLinks, content);
    try {
      let id = reportId;
      if (!id) {
        const created = await createMut.mutateAsync({ fellowshipId, month, year: currentYear, content: composed });
        id = created.id;
        navigate(`/fellowship/fellowships/${fellowshipId}/reports/${id}`, { replace: true });
      } else {
        await updateMut.mutateAsync({ id, body: { content: composed } });
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
                      disabled={!prLinks.every((l) => isValidGithubLink(l))}
                      sx={{ mt: 0.5 }}
                    >
                      Add another link
                    </Button>
                  </Box>

                  <TextField
                    multiline
                    fullWidth
                    minRows={12}
                    maxRows={24}
                    placeholder="Progress this month — wins, blockers, code/docs links, next month's focus. Markdown supported."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!!reportId && reportContent.isLoading}
                    error={overWordLimit}
                    helperText={
                      <Box component="span" sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {wordCount} / {WORD_LIMIT} words
                      </Box>
                    }
                  />

                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      onClick={handleSaveDraft}
                      disabled={
                        !fellowshipId ||
                        !fellowshipActive ||
                        !content.trim() ||
                        overWordLimit ||
                        createMut.isPending ||
                        updateMut.isPending
                      }
                    >
                      {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save draft'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setConfirmSubmitOpen(true)}
                      disabled={
                        !canSubmit ||
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
                  {content.trim() ? (
                    <MarkdownView content={content} />
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      This report has no content.
                    </Typography>
                  )}
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
