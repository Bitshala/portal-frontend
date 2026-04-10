export interface BonusQuestion {
  question: string;
  image?: string;
}

export interface RichQuestion {
  text: string;
  attachments: { filename: string; url: string }[];
}

export interface WeekContent {
  week: number;
  title: string;
  content: string;
  gdQuestions: (string | RichQuestion)[];
  bonusQuestions?: (string | BonusQuestion | RichQuestion)[];
  assignmentLinks?: Record<number, string>;
  classroomUrl?: string | null;
  classroomInviteLink?: string | null;
}
