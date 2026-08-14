import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { FileDown } from 'lucide-react';
import { useApplicationProposal } from '../../hooks/fellowshipHooks';
import { FellowshipKind } from '../../types/fellowship';
import { formatFellowshipKind } from '../../utils/fellowshipFormat';
import ProposalView from './ProposalView';

// Kept local, mirroring how the fellowship tables keep their own color maps.
const KIND_COLORS: Record<FellowshipKind, string> = {
  [FellowshipKind.FELLOWSHIP]: '#a1a1aa',
  [FellowshipKind.STARTER_GRANT]: '#fbbf24',
};

/**
 * Quick proposal viewer for screens that only hold an applicationId
 * (e.g. the fellowships manage table). Includes a jump to the
 * print-friendly view for PDF export.
 */
export const ProposalDialog = ({
  applicationId,
  title,
  kind,
  onClose,
  actions,
}: {
  applicationId: string | null;
  /** Fallback dialog title while the proposal loads or has no title. */
  title?: string;
  /** Shown as a badge in the header when opened from a fellowship (not a bare
   * application) — applications don't carry a kind. */
  kind?: FellowshipKind;
  onClose: () => void;
  /** Optional extra footer action(s), e.g. an admin "Start contract" button. */
  actions?: React.ReactNode;
}) => {
  const proposalQuery = useApplicationProposal(applicationId ?? '', {
    enabled: !!applicationId,
  });
  const proposal = proposalQuery.data;

  return (
    <Dialog open={!!applicationId} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>{proposal?.title || title || 'Proposal'}</span>
        {kind && (
          <Box
            component="span"
            sx={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: 0.4,
              color: KIND_COLORS[kind],
            }}
          >
            {formatFellowshipKind(kind)}
          </Box>
        )}
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
