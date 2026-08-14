import { FellowshipKind, FellowshipType } from '../types/fellowship';

/** "DEVELOPER" → "Developer" — raw enum values are not user-facing copy. */
export const formatFellowshipType = (type: FellowshipType): string =>
  type.charAt(0) + type.slice(1).toLowerCase();

// `kind` needs an explicit label map — the capitalize trick above would turn
// STARTER_GRANT into "Starter_grant".
const FELLOWSHIP_KIND_LABELS: Record<FellowshipKind, string> = {
  [FellowshipKind.FELLOWSHIP]: 'Fellowship',
  [FellowshipKind.STARTER_GRANT]: 'Starter Grant',
};

export const formatFellowshipKind = (kind: FellowshipKind): string =>
  FELLOWSHIP_KIND_LABELS[kind];
