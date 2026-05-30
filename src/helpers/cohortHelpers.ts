import { CohortType } from '../types/enums.ts';
import apiService from '../services/apiService.ts';
import type { CohortWeekQuestion, GetCohortResponseDto } from '../types/api.ts';
import type { RenderQuestion, RenderWeek } from '../types/instructions.ts';

export const cohortTypeToName = (type: CohortType) : string => {
  switch (type) {
    case CohortType.MASTERING_BITCOIN:
      return 'Mastering Bitcoin';
    case CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE:
      return 'Learning Bitcoin from the Command Line';
    case CohortType.PROGRAMMING_BITCOIN:
      return 'Programming Bitcoin';
    case CohortType.BITCOIN_PROTOCOL_DEVELOPMENT:
      return 'Bitcoin Protocol Development';
    case CohortType.MASTERING_LIGHTNING_NETWORK:
      return 'Mastering Lightning Network';
    default:
      return 'Unknown Cohort';
  }
}

export const cohortTypeToShortName = (type: string): string => {
  switch (type) {
    case CohortType.MASTERING_BITCOIN:
      return 'MB';
    case CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE:
      return 'LBTCL';
    case CohortType.PROGRAMMING_BITCOIN:
      return 'PB';
    case CohortType.BITCOIN_PROTOCOL_DEVELOPMENT:
      return 'BPD';
    case CohortType.MASTERING_LIGHTNING_NETWORK:
      return 'MLN';
    default:
      return type.split('_').map((w) => w[0]).join('');
  }
}

export const formatCohortDate = (isoDate: string) : string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const toRenderQuestion = (
  cohortId: string,
  question: CohortWeekQuestion,
): RenderQuestion => ({
  text: question.text,
  attachments: question.attachments.map((filename) => ({
    filename,
    url: apiService.getAttachmentUrl(cohortId, filename),
  })),
});

// Maps an API cohort into the render model the instruction sheet consumes.
// Only GROUP_DISCUSSION weeks are surfaced (orientation/graduation are excluded),
// and question attachment filenames are resolved to authenticated stream URLs.
export const toRenderWeeks = (cohort: GetCohortResponseDto): RenderWeek[] =>
  cohort.weeks
    .filter((week) => week.type === 'GROUP_DISCUSSION')
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((week) => ({
      week: week.week,
      title: week.title,
      readingMaterial: week.readingMaterial,
      activity: week.activity,
      questions: week.questions.map((q) => toRenderQuestion(cohort.id, q)),
      bonusQuestions: week.bonusQuestions.map((q) => toRenderQuestion(cohort.id, q)),
      exercise: week.exercise,
      classroomAssignmentUrl: week.classroomAssignmentUrl,
      classroomInviteLink: week.classroomInviteLink,
    }));