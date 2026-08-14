import {
  useApplicationNotes,
  useCreateApplicationNote,
  useDeleteApplicationNote,
  useUpdateApplicationNote,
} from '../../hooks/fellowshipHooks';
import { useUser } from '../../hooks/userHooks';
import { UserRole } from '../../types/enums';
import InternalNotes from './InternalNotes';

/**
 * Internal, admin-only notes on a fellowship application — a shared thread admins
 * use while reviewing a proposal. Rendered inside the review detail pane.
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

  const notesQuery = useApplicationNotes(applicationId, { enabled: isAdmin });
  const createMut = useCreateApplicationNote();
  const updateMut = useUpdateApplicationNote();
  const deleteMut = useDeleteApplicationNote();

  if (!isAdmin) return null;

  return (
    <InternalNotes
      audienceLabel="applicant"
      currentUserId={currentUser?.id}
      notes={notesQuery.data ?? []}
      isLoading={notesQuery.isLoading}
      isError={notesQuery.isError}
      error={notesQuery.error}
      onRetry={() => notesQuery.refetch()}
      creating={createMut.isPending}
      updating={updateMut.isPending}
      deleting={deleteMut.isPending}
      onCreate={(body) => createMut.mutateAsync({ applicationId, body: { body } }).then(() => {})}
      onUpdate={(noteId, body) =>
        updateMut.mutateAsync({ applicationId, noteId, body: { body } }).then(() => {})
      }
      onDelete={(noteId) => deleteMut.mutateAsync({ applicationId, noteId })}
      onResync={() => useApplicationNotes.invalidate(applicationId)}
    />
  );
};

export default ApplicationNotes;
