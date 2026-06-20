import { useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Check, Download, X } from 'lucide-react';
import StatusChip from './StatusChip';
import PdfUploadField from './PdfUploadField';
import {
  useDownloadFellowshipDocument,
  useReviewFellowshipDocument,
  useUploadFellowshipDocument,
} from '../../hooks/fellowshipHooks';
import {
  FellowshipDocumentStatus,
  FellowshipDocumentType,
  type FellowshipDocumentResponseDto,
} from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

const DOC_TYPE_LABEL: Record<FellowshipDocumentType, string> = {
  [FellowshipDocumentType.UNSIGNED_CONTRACT]: 'Unsigned contract',
  [FellowshipDocumentType.SIGNED_CONTRACT]: 'Signed contract',
  [FellowshipDocumentType.W8BEN]: 'W-8BEN',
};

const DOC_TYPE_HINT: Record<FellowshipDocumentType, string> = {
  [FellowshipDocumentType.UNSIGNED_CONTRACT]: 'Download it, sign it, then upload the signed copy below.',
  [FellowshipDocumentType.SIGNED_CONTRACT]: 'Upload the signed contract (PDF, ≤ 15 MB).',
  [FellowshipDocumentType.W8BEN]: 'Upload your completed W-8BEN (PDF, ≤ 15 MB).',
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

type Mode = 'fellow' | 'admin';

type Props = {
  fellowshipId: string;
  documents: FellowshipDocumentResponseDto[];
  mode: Mode;
  onNotify: (kind: 'success' | 'error', msg: string) => void;
};

// Shared document list. In 'fellow' mode the owner downloads the unsigned
// contract and uploads/re-uploads their signed contract + W-8BEN; in 'admin'
// mode a reviewer downloads each fellow doc and approves/rejects it. UI is
// driven entirely off each document's `type` and `status`.
const DocumentList = ({ fellowshipId, documents, mode, onNotify }: Props) => (
  <Stack spacing={1.5}>
    {documents.map((doc) => (
      <DocumentRow
        key={doc.documentId}
        fellowshipId={fellowshipId}
        doc={doc}
        mode={mode}
        onNotify={onNotify}
      />
    ))}
  </Stack>
);

const DocumentRow = ({
  fellowshipId,
  doc,
  mode,
  onNotify,
}: {
  fellowshipId: string;
  doc: FellowshipDocumentResponseDto;
  mode: Mode;
  onNotify: (kind: 'success' | 'error', msg: string) => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const uploadMut = useUploadFellowshipDocument();
  const reviewMut = useReviewFellowshipDocument();
  const downloadMut = useDownloadFellowshipDocument();

  const hasFile = doc.fileName !== null;
  const isRejected = doc.status === FellowshipDocumentStatus.REJECTED;
  // The fellow only uploads SIGNED_CONTRACT / W8BEN — never the unsigned
  // contract — and only while it's awaiting an upload or was rejected.
  const isUploadable =
    mode === 'fellow' &&
    doc.type !== FellowshipDocumentType.UNSIGNED_CONTRACT &&
    (doc.status === FellowshipDocumentStatus.AWAITING_UPLOAD || isRejected);
  const isReviewable =
    mode === 'admin' && doc.status === FellowshipDocumentStatus.PENDING_REVIEW;

  const busy = uploadMut.isPending || reviewMut.isPending || downloadMut.isPending;

  const handleDownload = async () => {
    try {
      const { blob, filename } = await downloadMut.mutateAsync({
        fellowshipId,
        documentId: doc.documentId,
      });
      // Prefer the document's own fileName: it's always present once uploaded
      // and, unlike Content-Disposition, isn't subject to CORS exposed-header
      // limits. Fall back to the parsed header name, then a generic default.
      triggerBlobDownload(blob, doc.fileName || filename || 'document.pdf');
    } catch (e) {
      onNotify('error', extractErrorMessage(e));
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await uploadMut.mutateAsync({ fellowshipId, documentId: doc.documentId, file });
      onNotify('success', `${DOC_TYPE_LABEL[doc.type]} uploaded — pending review.`);
      setFile(null);
    } catch (e) {
      onNotify('error', extractErrorMessage(e));
    }
  };

  const handleApprove = async () => {
    try {
      await reviewMut.mutateAsync({
        fellowshipId,
        documentId: doc.documentId,
        body: { action: 'APPROVE' },
      });
      onNotify('success', `${DOC_TYPE_LABEL[doc.type]} approved.`);
    } catch (e) {
      onNotify('error', extractErrorMessage(e));
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await reviewMut.mutateAsync({
        fellowshipId,
        documentId: doc.documentId,
        body: { action: 'REJECT', rejectionReason: rejectReason.trim() },
      });
      onNotify('success', `${DOC_TYPE_LABEL[doc.type]} rejected — fellow notified.`);
      setRejecting(false);
      setRejectReason('');
    } catch (e) {
      onNotify('error', extractErrorMessage(e));
    }
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        spacing={1.5}
        alignItems={{ sm: 'center' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }}>
              {DOC_TYPE_LABEL[doc.type]}
            </Typography>
            <StatusChip status={doc.status} />
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {doc.fileName ?? DOC_TYPE_HINT[doc.type]}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {hasFile && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={14} />}
              onClick={handleDownload}
              disabled={busy}
              sx={{ color: 'text.primary', borderColor: 'divider', textTransform: 'none' }}
            >
              {downloadMut.isPending ? 'Downloading…' : 'Download'}
            </Button>
          )}
          {isReviewable && !rejecting && (
            <>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<X size={14} />}
                disabled={busy}
                onClick={() => setRejecting(true)}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<Check size={14} />}
                disabled={busy}
                onClick={handleApprove}
              >
                {reviewMut.isPending ? 'Saving…' : 'Approve'}
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {isRejected && doc.rejectionReason && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {doc.rejectionReason}
        </Alert>
      )}

      {isUploadable && (
        <Box sx={{ mt: 1.5 }}>
          <PdfUploadField
            file={file}
            onChange={setFile}
            disabled={uploadMut.isPending}
            label={isRejected ? 'Choose a new PDF' : 'Choose PDF'}
          />
          <Button
            variant="contained"
            size="small"
            sx={{ mt: 1 }}
            disabled={!file || uploadMut.isPending}
            onClick={handleUpload}
          >
            {uploadMut.isPending ? 'Uploading…' : isRejected ? 'Re-upload' : 'Upload'}
          </Button>
        </Box>
      )}

      {isReviewable && rejecting && (
        <Box sx={{ mt: 1.5 }}>
          <TextField
            multiline
            fullWidth
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection (shown to the fellow)"
            slotProps={{ htmlInput: { maxLength: 2000 } }}
            autoFocus
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="flex-end">
            <Button
              size="small"
              onClick={() => {
                setRejecting(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              disabled={!rejectReason.trim() || reviewMut.isPending}
              onClick={handleReject}
            >
              {reviewMut.isPending ? 'Rejecting…' : 'Confirm reject'}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default DocumentList;
