import type { GetFellowshipResponseDto } from '../types/fellowship';
import { useApplicationProposal } from './fellowshipHooks';

// Fellowships often have no onboarding projectName — the project title lives
// in the application proposal. Fall back to the proposal's title field.
export const useFellowshipProjectTitle = (
  fellowship: GetFellowshipResponseDto | null | undefined,
): string => {
  const proposalQuery = useApplicationProposal(fellowship?.applicationId ?? '', {
    enabled: Boolean(fellowship?.applicationId) && !fellowship?.projectName,
  });
  return fellowship?.projectName || proposalQuery.data?.title || '';
};

export default useFellowshipProjectTitle;
