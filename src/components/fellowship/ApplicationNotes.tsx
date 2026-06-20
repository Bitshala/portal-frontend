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
import {
  useApplicationNotes,
  useCreateApplicationNote,
  useDeleteApplicationNote,
  useUpdateApplicationNote,
} from '../../hooks/fellowshipHooks';
import { useUser } from '../../hooks/userHooks';
import { UserRole } from '../../types/enums';
import type { FellowshipApplicationNote } from '../../types/fellowship';
import { extractErrorMessage } from '../../utils/errorUtils';

// Body rules mirror the server: a trimmed note of 1..5000 chars.
const NOTE_MAX_LENGTH = 5000;

// Matches the uppercase caption used by the proposal sections this panel sits
// below, so the "Internal notes" header reads as one of the proposal sections.
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
// the day-granular helper on the applications screen would be too coarse here.
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
 * Internal, admin-only notes on a fellowship application — a shared thread
 * admins use while reviewing a proposal. Rendered inside the review detail pane.
 *
 * Notes are NEVER shown on any applicant-facing view; the API also requires the
 * ADMIN role (403 otherwise). The applications screen is reachable by teaching
 * assistants too, so this panel self-gates and renders nothing for non-admins
 * rather than show a feature whose every request would fail.
 *
 * Remount this per application (a `key={applicationId}`) so the composer / edit /
 * delete state never leaks from one application's thread to another's.
 */
const ApplicationNotes = ({ applicationId }: { applicationId: string }) => {
  const { data: currentUser } = useUser();
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const currentUserId = currentUser?.id;

  const notesQuery = useApplicationNotes(applicationId, { enabled: isAdmin });
  const createMut = useCreateApplicationNote();
  const updateMut = useUpdateApplicationNote();
  const deleteMut = useDeleteApplicationNote();

  const [composer, setComposer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<FellowshipApplicationNote | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isAdmin) return null;

  const notes = notesQuery.data ?? [];

  const handleCreate = async () => {
    const body = composer.trim();
    if (!body || createMut.isPending) return;
    setActionError(null);
    try {
      await createMut.mutateAsync({ applicationId, body: { body } });
      setComposer('');
    } catch (e) {
      setActionError(extractErrorMessage(e));
    }
  };

  const startEdit = (note: FellowshipApplicationNote) => {
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
    if (!body || updateMut.isPending) return;
    setActionError(null);
    try {
      await updateMut.mutateAsync({ applicationId, noteId: editingId, body: { body } });
      cancelEdit();
    } catch (e) {
      // Hiding the controls on others' notes is only a convenience — the server
      // is the real boundary. On a 403 (not the author) or 404 (note changed
      // under us), surface the message and resync the thread from the server.
      setActionError(extractErrorMessage(e));
      cancelEdit();
      await useApplicationNotes.invalidate(applicationId);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleteMut.isPending) return;
    setActionError(null);
    try {
      await deleteMut.mutateAsync({ applicationId, noteId: pendingDelete.id });
      setPendingDelete(null);
    } catch (e) {
      setActionError(extractErrorMessage(e));
      setPendingDelete(null);
      await useApplicationNotes.invalidate(applicationId);
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
          Shared with admins only — never shown to the applicant.
        </Typography>

        {actionError && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {notesQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={18} />
          </Box>
        ) : notesQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => notesQuery.refetch()}>
                Retry
              </Button>
            }
          >
            Couldn't load notes: {extractErrorMessage(notesQuery.error)}
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
                savingEdit={updateMut.isPending}
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
            disabled={createMut.isPending}
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
              disabled={!composer.trim() || createMut.isPending}
            >
              {createMut.isPending ? 'Adding…' : 'Add note'}
            </Button>
          </Stack>
        </Box>
      </Box>

      <DeleteNoteDialog
        open={!!pendingDelete}
        busy={deleteMut.isPending}
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
  note: FellowshipApplicationNote;
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

export default ApplicationNotes;
