import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Lock, Pencil, Trash2 } from 'lucide-react';
import { extractErrorMessage } from '../../utils/errorUtils';

// Body rules mirror the server: a trimmed note of 1..5000 chars.
const NOTE_MAX_LENGTH = 5000;

// The subset of a note the UI actually reads. Both FellowshipApplicationNote and
// FellowshipReportNote are structurally assignable to this — their differing
// parent-id field (applicationId / reportId) is never read in here.
export interface InternalNote {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

// Matches the uppercase caption used by the proposal / report sections this panel
// sits below, so the "Internal notes" header reads as one of those sections.
const sectionLabelSx = {
  color: 'text.secondary',
  letterSpacing: 1,
  fontSize: '0.68rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
};

const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Minute-granular relative time — notes in a thread are often minutes apart, so
// the day-granular helper on the admin list screens would be too coarse here.
const relativeTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
};

const absoluteTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/**
 * Internal, admin-only notes on a fellowship entity — a shared thread admins use
 * while reviewing. This is a presentational panel: it holds the composer / edit /
 * delete UI state but takes its data and mutations as normalized props, so both
 * the application-notes and report-notes wrappers can feed it.
 *
 * Notes are NEVER shown on any user-facing view; the wrappers gate on the ADMIN
 * role and only mount this on admin-only screens. Remount per parent entity (a
 * `key` on the wrapper) so the composer / edit / delete state never leaks from
 * one thread to another's.
 *
 * The mutation callbacks (`onCreate` / `onUpdate` / `onDelete`) must REJECT on
 * error so the panel can surface the server message; `onResync` re-fetches the
 * thread after a 403/404 (hiding controls on others' notes is only a convenience,
 * the server is the real boundary).
 */
const InternalNotes = ({
  currentUserId,
  notes,
  isLoading,
  isError,
  error,
  onRetry,
  creating,
  updating,
  deleting,
  onCreate,
  onUpdate,
  onDelete,
  onResync,
  audienceLabel,
}: {
  currentUserId: string | undefined;
  notes: InternalNote[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  onCreate: (body: string) => Promise<void>;
  onUpdate: (noteId: string, body: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onResync: () => Promise<void>;
  audienceLabel: string;
}) => {
  const [composer, setComposer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<InternalNote | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreate = async () => {
    const body = composer.trim();
    if (!body || creating) return;
    setActionError(null);
    try {
      await onCreate(body);
      setComposer('');
    } catch (e) {
      setActionError(extractErrorMessage(e));
    }
  };

  const startEdit = (note: InternalNote) => {
    setActionError(null);
    setEditingId(note.id);
    setEditDraft(note.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const body = editDraft.trim();
    if (!body || updating) return;
    setActionError(null);
    try {
      await onUpdate(editingId, body);
      cancelEdit();
    } catch (e) {
      // Hiding the controls on others' notes is only a convenience — the server
      // is the real boundary. On a 403 (not the author) or 404 (note changed
      // under us), surface the message and resync the thread from the server.
      setActionError(extractErrorMessage(e));
      cancelEdit();
      await onResync();
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setActionError(null);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } catch (e) {
      setActionError(extractErrorMessage(e));
      setPendingDelete(null);
      await onResync();
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0.75, p: 2 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25 }}>
          <Lock size={13} color="#a1a1aa" />
          <Typography variant="caption" sx={sectionLabelSx}>
            Internal notes
          </Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
          Shared with admins only — never shown to the {audienceLabel}.
        </Typography>

        {actionError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={18} />
          </Box>
        ) : isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            }
          >
            Couldn't load notes: {extractErrorMessage(error)}
          </Alert>
        ) : notes.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 0.5 }}>
            No internal notes yet.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isOwn={!!currentUserId && note.authorId === currentUserId}
                isEditing={editingId === note.id}
                editDraft={editDraft}
                savingEdit={updating}
                onEditDraftChange={setEditDraft}
                onStartEdit={() => startEdit(note)}
                onCancelEdit={cancelEdit}
                onSaveEdit={handleSaveEdit}
                onRequestDelete={() => setPendingDelete(note)}
              />
            ))}
          </Stack>
        )}

        <Box sx={{ mt: 2 }}>
          <TextField
            multiline
            fullWidth
            minRows={3}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            placeholder="Add an internal note…"
            disabled={creating}
            slotProps={{
              htmlInput: { maxLength: NOTE_MAX_LENGTH, 'aria-label': 'New internal note' },
            }}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
            >
              {composer.length}/{NOTE_MAX_LENGTH}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleCreate}
              disabled={!composer.trim() || creating}
            >
              {creating ? 'Adding…' : 'Add note'}
            </Button>
          </Stack>
        </Box>
      </Box>

      <DeleteNoteDialog
        open={!!pendingDelete}
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};

const NoteCard = ({
  note,
  isOwn,
  isEditing,
  editDraft,
  savingEdit,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
}: {
  note: InternalNote;
  isOwn: boolean;
  isEditing: boolean;
  editDraft: string;
  savingEdit: boolean;
  onEditDraftChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRequestDelete: () => void;
}) => {
  const edited = note.updatedAt !== note.createdAt;
  const trimmedDraft = editDraft.trim();
  // Nothing to save on an empty draft or one identical to the stored note.
  const canSave = !!trimmedDraft && trimmedDraft !== note.body.trim() && !savingEdit;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0.75,
        bgcolor: 'rgba(255,255,255,0.02)',
        p: 1.5,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: 'rgba(249,115,22,0.15)',
              color: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.68rem',
              fontWeight: 700,
            }}
          >
            {initialsOf(note.authorName)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.83rem', color: 'text.primary' }}>
              {note.authorName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.72rem' }}
              title={absoluteTime(note.createdAt)}
            >
              {relativeTime(note.createdAt)}
              {edited && ' · (edited)'}
            </Typography>
          </Box>
        </Stack>

        {isOwn && !isEditing && (
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <IconButton
              size="small"
              aria-label="Edit note"
              onClick={onStartEdit}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              <Pencil size={14} />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Delete note"
              onClick={onRequestDelete}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <Trash2 size={14} />
            </IconButton>
          </Stack>
        )}
      </Stack>

      {isEditing ? (
        <Box sx={{ mt: 1 }}>
          <TextField
            multiline
            fullWidth
            minRows={2}
            value={editDraft}
            onChange={(e) => onEditDraftChange(e.target.value)}
            disabled={savingEdit}
            autoFocus
            slotProps={{
              htmlInput: { maxLength: NOTE_MAX_LENGTH, 'aria-label': 'Edit note' },
            }}
          />
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontFamily: 'monospace' }}
            >
              {editDraft.length}/{NOTE_MAX_LENGTH}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                onClick={onCancelEdit}
                disabled={savingEdit}
                sx={{ color: 'text.secondary' }}
              >
                Cancel
              </Button>
              <Button variant="contained" size="small" onClick={onSaveEdit} disabled={!canSave}>
                {savingEdit ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      ) : (
        <Typography
          variant="body2"
          sx={{ mt: 1, color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
        >
          {note.body}
        </Typography>
      )}
    </Box>
  );
};

const DeleteNoteDialog = ({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open={open} onClose={busy ? undefined : onCancel} fullWidth maxWidth="xs">
    <DialogTitle sx={{ fontWeight: 700 }}>Delete note</DialogTitle>
    <DialogContent>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        This permanently deletes your internal note. This can't be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button variant="contained" color="error" onClick={onConfirm} disabled={busy}>
        {busy ? 'Deleting…' : 'Delete'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default InternalNotes;
