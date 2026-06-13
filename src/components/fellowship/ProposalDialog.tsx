import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { FileDown } from 'lucide-react';
import { useMemo } from 'react';
import { useApplicationProposal } from '../../hooks/fellowshipHooks';
import { parseProposal } from '../../utils/proposalFormat';
import ProposalView from './ProposalView';

/**
 * Quick proposal viewer for screens that only hold an applicationId
 * (e.g. the fellowships manage table). Includes a jump to the
 * print-friendly view for PDF export.
 */
export const ProposalDialog = ({
  applicationId,
  title,
  onClose,
  actions,
}: {
  applicationId: string | null;
  /** Fallback dialog title while the proposal loads or has no title. */
  title?: string;
  onClose: () => void;
  /** Optional extra footer action(s), e.g. an admin "Start contract" button. */
  actions?: React.ReactNode;
}) => {
  const proposalQuery = useApplicationProposal(applicationId ?? '', {
    enabled: !!applicationId,
  });
  const proposal = proposalQuery.data?.proposal ?? '';
  const proposalTitle = useMemo(
    () => (proposal ? parseProposal(proposal).title : ''),
    [proposal],
  );

  return (
    <Dialog open={!!applicationId} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {proposalTitle || title || 'Proposal'}
      </DialogTitle>
      <DialogContent dividers>
        {proposalQuery.isLoading ? (
          <CircularProgress size={20} sx={{ my: 3 }} />
        ) : proposalQuery.isError ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', my: 2 }}>
            Could not load the proposal.
          </Typography>
        ) : (
          <ProposalView proposal={proposal} expandable />
        )}
      </DialogContent>
      <DialogActions>
        {applicationId && (
          <Button
            startIcon={<FileDown size={14} />}
            onClick={() =>
              window.open(
                `/fellowship/applications/${applicationId}/proposal/print`,
                '_blank',
              )
            }
            sx={{ color: 'text.secondary', mr: 'auto' }}
          >
            Export PDF
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
        {actions}
      </DialogActions>
    </Dialog>
  );
};

export default ProposalDialog;
