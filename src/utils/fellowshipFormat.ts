import { FellowshipType } from '../types/fellowship';

/** "DEVELOPER" → "Developer" — raw enum values are not user-facing copy. */
export const formatFellowshipType = (type: FellowshipType): string =>
  type.charAt(0) + type.slice(1).toLowerCase();
