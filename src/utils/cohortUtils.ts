import type { CohortRow, CohortStatus } from '../types/cohort';
import { CohortType } from '../types/enums';
import { cohortTypeToName } from '../helpers/cohortHelpers';

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

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export type CohortLike = {
  id: string;
  type: string;
  season: number;
  startDate: string;
  endDate: string;
  weeks?: unknown[];
};

export const calculateCompletedWeeks = (
  startDate: string,
  endDate: string,
  totalWeeks: number,
  now = new Date(),
): number => {
  const status = computeStatus(startDate, endDate);
  if (status === 'Completed') return totalWeeks;
  if (status === 'Active' && totalWeeks > 0) {
    const msElapsed = now.getTime() - new Date(startDate).getTime();
    return Math.max(0, Math.min(Math.floor(msElapsed / MS_PER_WEEK), totalWeeks));
  }
  return 0;
};

export const toCohortRow = <TCohort extends CohortLike>(cohort: TCohort, now = new Date()): CohortRow => {
  const totalWeeks = cohort.weeks?.length ?? 0;
  return {
    id: cohort.id,
    name: cohortTypeToName(cohort.type as CohortType),
    type: cohort.type,
    season: cohort.season,
    status: computeStatus(cohort.startDate, cohort.endDate),
    startDate: cohort.startDate,
    endDate: cohort.endDate,
    weeks: totalWeeks,
    completedWeeks: calculateCompletedWeeks(cohort.startDate, cohort.endDate, totalWeeks, now),
    raw: cohort,
  };
};

export const groupCohortsByStatus = <TRow extends { status: string }>(rows: TRow[]) => ({
  Active: rows.filter((row) => row.status === 'Active'),
  Upcoming: rows.filter((row) => row.status === 'Upcoming'),
  Completed: rows.filter((row) => row.status === 'Completed'),
});

export const toCohortStatusTabs = (grouped: Record<CohortStatus, unknown[]>) => [
  { label: 'Active', value: 'Active', count: grouped.Active.length },
  { label: 'Upcoming', value: 'Upcoming', count: grouped.Upcoming.length },
  { label: 'Completed', value: 'Completed', count: grouped.Completed.length },
];

export type JoinableCohortLike = CohortLike & { registrationDeadline: string };

export const getJoinableActiveCohorts = <TCohort extends JoinableCohortLike>(
  allCohorts: TCohort[] = [],
  myCohorts: CohortLike[] = [],
): TCohort[] => {
  const activeNonEnrolled = allCohorts
    .filter((cohort) => isCohortActive(cohort.endDate))
    .filter((cohort) => !myCohorts.some((myCohort) => myCohort.id === cohort.id));

  return activeNonEnrolled.filter((cohort) => {
    const registrationOpen = isRegistrationOpen(cohort.registrationDeadline);
    const enrolledInNewerSeason = myCohorts.some(
      (myCohort) => myCohort.type === cohort.type && myCohort.season > cohort.season,
    );
    if (enrolledInNewerSeason) return false;
    if (registrationOpen) return true;

    const hasNewerOpen = activeNonEnrolled.some(
      (other) =>
        other.type === cohort.type &&
        other.season > cohort.season &&
        isRegistrationOpen(other.registrationDeadline),
    );
    return !hasNewerOpen;
  });
};

export const COHORT_TYPES = [
  CohortType.MASTERING_BITCOIN,
  CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE,
  CohortType.BITCOIN_PROTOCOL_DEVELOPMENT,
  CohortType.PROGRAMMING_BITCOIN,
  CohortType.MASTERING_LIGHTNING_NETWORK,
];
