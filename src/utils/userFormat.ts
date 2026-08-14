import { UserRole } from '../types/enums.ts';
import type { CertificateType } from '../types/api.ts';

// Raw enum values are not user-facing copy — map roles to readable labels.
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.TEACHING_ASSISTANT]: 'Teaching Assistant',
  [UserRole.STUDENT]: 'Student',
};

export const formatUserRole = (role: UserRole | string): string =>
  USER_ROLE_LABELS[role as UserRole] ?? role;

// Chip palette per role — matches the StatusChip idiom:
// rgba(color,0.12) bg / solid text color / rgba(color,0.3) border.
export const USER_ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  [UserRole.ADMIN]: { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', border: 'rgba(249,115,22,0.3)' },
  [UserRole.TEACHING_ASSISTANT]: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: 'rgba(96,165,250,0.3)' },
  [UserRole.STUDENT]: { bg: 'rgba(161,161,170,0.12)', color: '#d4d4d8', border: 'rgba(161,161,170,0.25)' },
};

// "PERFORMER" → "Performer", "PARTICIPANT" → "Participant".
export const formatCertificateType = (type: CertificateType): string =>
  type === 'PERFORMER' ? 'Performer' : 'Participant';

// Rank is null for PARTICIPANT certificates and 1–3 for top PERFORMERs.
export const formatCertificateRank = (rank: 1 | 2 | 3 | null): string | null =>
  rank ? `Rank ${rank}` : null;
