import { useMemo } from 'react';
import type { GetFellowshipResponseDto } from '../types/fellowship';
import { parseProposal } from '../utils/proposalFormat';
import { useApplicationProposal } from './fellowshipHooks';

// Fellowships often have no onboarding projectName — the project title lives
// in the application proposal's markdown heading. Fall back to parsing it out.
export const useFellowshipProjectTitle = (
  fellowship: GetFellowshipResponseDto | null | undefined,
): string => {
  const proposalQuery = useApplicationProposal(fellowship?.applicationId ?? '', {
    enabled: Boolean(fellowship?.applicationId) && !fellowship?.projectName,
  });
  const proposalTitle = useMemo(
    () =>
      proposalQuery.data?.proposal ? parseProposal(proposalQuery.data.proposal).title : '',
    [proposalQuery.data?.proposal],
  );
  return fellowship?.projectName || proposalTitle;
};

export default useFellowshipProjectTitle;
