import type { CohortWeekExercise, ReadingMaterialLink } from './api';

// Render model for the instruction sheet. Built from the API cohort response
// (see helpers/cohortHelpers#toRenderWeeks); the UI no longer holds any static
// instruction content.

export interface ResolvedAttachment {
  filename: string;
  // Authenticated stream URL (GET /cohorts/attachments/:cohortId/:filename).
  url: string;
}

export interface RenderQuestion {
  text: string;
  attachments: ResolvedAttachment[];
}

export interface RenderWeek {
  week: number;
  title: string | null;
  readingMaterial: ReadingMaterialLink[];
  activity: string | null;
  questions: RenderQuestion[];
  bonusQuestions: RenderQuestion[];
  exercise: CohortWeekExercise | null;
  classroomAssignmentUrl: string | null;
  classroomInviteLink: string | null;
}
