import {
  useCreateReportNote,
  useDeleteReportNote,
  useReportNotes,
  useUpdateReportNote,
} from '../../hooks/fellowshipHooks';
import { useUser } from '../../hooks/userHooks';
import { UserRole } from '../../types/enums';
import InternalNotes from './InternalNotes';

/**
 * Internal, admin-only notes on a fellowship report — a shared thread admins use
 * while reviewing a report. Rendered inside the admin report-detail drawer. These
 * are distinct from the fellow-facing `reviewerRemarks` field and are NEVER shown
 * to the fellow; the API also requires the ADMIN role (403 otherwise), so this
 * panel self-gates and renders nothing for non-admins.
 *
 * Remount this per report (a `key={reportId}`) so the composer / edit / delete
 * state never leaks from one report's thread to another's.
 */
const ReportNotes = ({ reportId }: { reportId: string }) => {
  const { data: currentUser } = useUser();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const notesQuery = useReportNotes(reportId, { enabled: isAdmin });
  const createMut = useCreateReportNote();
  const updateMut = useUpdateReportNote();
  const deleteMut = useDeleteReportNote();

  if (!isAdmin) return null;

  return (
    <InternalNotes
      audienceLabel="fellow"
      currentUserId={currentUser?.id}
      notes={notesQuery.data ?? []}
      isLoading={notesQuery.isLoading}
      isError={notesQuery.isError}
      error={notesQuery.error}
      onRetry={() => notesQuery.refetch()}
      creating={createMut.isPending}
      updating={updateMut.isPending}
      deleting={deleteMut.isPending}
      onCreate={(body) => createMut.mutateAsync({ reportId, body: { body } }).then(() => {})}
      onUpdate={(noteId, body) =>
        updateMut.mutateAsync({ reportId, noteId, body: { body } }).then(() => {})
      }
      onDelete={(noteId) => deleteMut.mutateAsync({ reportId, noteId })}
      onResync={() => useReportNotes.invalidate(reportId)}
    />
  );
};

export default ReportNotes;
