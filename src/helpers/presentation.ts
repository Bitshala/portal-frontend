import type { RenderWeek, ResolvedAttachment } from '../types/instructions';

// Hard-coded reminder shown before every bonus question during a GD presentation.
export const SAFETY_SLIDE_TEXT = 'Fix the money, fix the world';

// One screen of the GD presentation. Built from a RenderWeek; the page renders
// each kind differently. A `safety` slide is inserted before every bonus question.
export type PresentationSlide =
  | { kind: 'intro'; displayName: string; week: number; title: string | null }
  | { kind: 'question'; number: number; text: string; attachments: ResolvedAttachment[] }
  | { kind: 'safety'; text: string }
  | { kind: 'bonus'; number: number; text: string; attachments: ResolvedAttachment[] }
  | { kind: 'end' };

// Assembles the full slide sequence for a week:
//   intro → Q1..Qn → (safety → bonus)* → end
export const buildPresentationSlides = (
  week: RenderWeek,
  displayName: string,
): PresentationSlide[] => {
  const slides: PresentationSlide[] = [];

  slides.push({ kind: 'intro', displayName, week: week.week, title: week.title });

  week.questions.forEach((q, i) => {
    slides.push({ kind: 'question', number: i + 1, text: q.text, attachments: q.attachments });
  });

  week.bonusQuestions.forEach((q, i) => {
    slides.push({ kind: 'safety', text: SAFETY_SLIDE_TEXT });
    slides.push({ kind: 'bonus', number: i + 1, text: q.text, attachments: q.attachments });
  });

  slides.push({ kind: 'end' });

  return slides;
};
