import type { CohortStatus } from '../types/cohort';
import { CohortType } from '../types/enums';

export const getCohortImage = (cohortType: string): string => {
  const imageMap: Record<string, string> = {
    'MASTERING_BITCOIN': 'https://bitshala.org/cohort/mb.webp',
    'LEARNING_BITCOIN_FROM_COMMAND_LINE': 'https://bitshala.org/cohort/lbtcl.webp',
    'BITCOIN_PROTOCOL_DEVELOPMENT': 'https://bitshala.org/cohort/bpd.webp',
    'PROGRAMMING_BITCOIN': 'https://bitshala.org/cohort/pb.webp',
    'MASTERING_LIGHTNING_NETWORK': 'https://bitshala.org/cohort/ln.webp',
  };
  return imageMap[cohortType] || 'https://bitshala.org/cohort/mb.webp';
};

export const isRegistrationOpen = (registrationDeadline: string): boolean => {
  const now = new Date();
  const deadline = new Date(registrationDeadline);
  return now <= deadline;
};

export const isCohortActive = (endDate: string): boolean => {
  const now = new Date();
  const cohortEndDate = new Date(endDate);
  cohortEndDate.setHours(23, 59, 59, 999);
  return now <= cohortEndDate;
};

export const formatCohortType = (cohortType: string): string => {
  return cohortType.replace(/_/g, ' ');
};

export const computeStatus = (startISO: string, endISO: string): CohortStatus => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const now = new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Completed';
  // Treat end date as end-of-day in local time so a cohort stays Active
  // through 23:59:59 of its endDate instead of flipping at UTC midnight.
  end.setHours(23, 59, 59, 999);
  if (now < start) return 'Upcoming';
  if (now > end) return 'Completed';
  return 'Active';
};

export const COHORT_TYPES = [
  CohortType.MASTERING_BITCOIN,
  CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE,
  CohortType.BITCOIN_PROTOCOL_DEVELOPMENT,
  CohortType.PROGRAMMING_BITCOIN,
  CohortType.MASTERING_LIGHTNING_NETWORK,
];
