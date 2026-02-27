import { Box, Typography, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ChevronDown, Check, X } from 'lucide-react';
import { cohortHasExercises, SCORES_WITH_EXERCISES, SCORES_WITHOUT_EXERCISES_SCALED } from '../../utils/calculations';

interface GroupDiscussionScores {
  attendance: boolean;
  communicationScore: number;
  maxCommunicationScore: number;
  depthOfAnswerScore: number;
  maxDepthOfAnswerScore: number;
  technicalBitcoinFluencyScore: number;
  maxTechnicalBitcoinFluencyScore: number;
  engagementScore: number;
  maxEngagementScore: number;
  bonusAnswerScore: number;
  maxBonusAnswerScore: number;
  bonusFollowupScore: number;
  maxBonusFollowupScore: number;
  totalScore: number;
  maxTotalScore: number;
  groupNumber: number | null;
}

interface ExerciseScores {
  isSubmitted: boolean;
  isPassing: boolean;
  totalScore: number;
  maxTotalScore: number;
}

export interface WeekData {
  week: number;
  weekId: string;
  weekType?: string;
  totalScore: number;
  maxTotalScore: number;
  groupDiscussionScores: GroupDiscussionScores;
  exerciseScores: ExerciseScores;
  attendance: boolean;
}

interface WeeklyBreakdownListProps {
  weeks: WeekData[];
  cohortType?: string;
}

const getScoreColor = (score: number, max: number): string => {
  if (max === 0) return '#71717a';
  const pct = (score / max) * 100;
  if (pct >= 80) return '#4ade80';
  if (pct >= 60) return '#facc15';
  if (pct >= 40) return '#fb923c';
  return '#f87171';
};

export const WeeklyBreakdownList = ({ weeks, cohortType }: WeeklyBreakdownListProps) => {
  const hasExercises = cohortHasExercises(cohortType || '');
  const maxScores = hasExercises ? SCORES_WITH_EXERCISES : SCORES_WITHOUT_EXERCISES_SCALED;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {weeks.map((week) => {
        const gd = week.groupDiscussionScores;
        const ex = week.exerciseScores || { isSubmitted: false, isPassing: false, totalScore: 0, maxTotalScore: 60 };

        return (
          <Accordion
            key={week.weekId}
            disableGutters
            sx={{
              bgcolor: 'transparent',
              boxShadow: 'none',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0 },
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDown size={18} color="#a1a1aa" />}
              sx={{
                px: 0,
                minHeight: 48,
                borderBottom: '1px solid #27272a',
                '&.Mui-expanded': { minHeight: 48 },
                '& .MuiAccordionSummary-content': { my: 1, alignItems: 'center', gap: { xs: 1, sm: 2 } },
                '& .MuiAccordionSummary-content.Mui-expanded': { my: 1 },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
              }}
            >
              {/* Week number */}
              <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem', minWidth: { xs: 48, sm: week.weekType === 'ORIENTATION' || week.weekType === 'GRADUATION' ? 100 : 60 } }}>
                {week.weekType === 'ORIENTATION' ? 'Orientation' : week.weekType === 'GRADUATION' ? 'Graduation' : `W${week.week.toString().padStart(2, '0')}`}
              </Typography>

              {/* Attendance */}
              <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {week.attendance
                  ? <Check size={16} color="#4ade80" />
                  : <X size={16} color="#f87171" />
                }
              </Box>

              {/* Group number */}
              {gd.groupNumber !== null && (
                <Chip
                  label={`Group ${gd.groupNumber}`}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                    display: { xs: 'none', sm: 'flex' },
                  }}
                />
              )}

              {/* Spacer */}
              <Box sx={{ flex: 1 }} />

              {/* GD score */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#a1a1aa', display: { xs: 'none', sm: 'block' } }}>GD</Typography>
                <Typography variant="body2" sx={{ color: '#d4d4d8', fontWeight: 600, fontSize: '0.8rem' }}>
                  {gd.totalScore}/{maxScores.gd}
                </Typography>
              </Box>

              {/* Exercise score */}
              {hasExercises && (
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: '#a1a1aa', display: { xs: 'none', sm: 'block' } }}>Ex</Typography>
                  <Typography variant="body2" sx={{ color: '#d4d4d8', fontWeight: 600, fontSize: '0.8rem' }}>
                    {ex.totalScore}/{maxScores.exercise}
                  </Typography>
                </Box>
              )}

              {/* Total */}
              <Typography sx={{ fontWeight: 700, color: getScoreColor(week.totalScore, maxScores.total), fontSize: '0.9rem', minWidth: 56, textAlign: 'right' }}>
                {week.totalScore}/{maxScores.total}
              </Typography>
            </AccordionSummary>

            <AccordionDetails sx={{ px: 0, pt: 2, pb: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: hasExercises ? '1fr 1fr' : '1fr' }, gap: 3, pl: { xs: 0, sm: 2 } }}>
                {/* GD Breakdown */}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#fb923c', mb: 1.5, fontSize: '0.85rem' }}>
                    Group Discussion
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <ScoreRow label="Communication" score={gd.communicationScore} max={gd.maxCommunicationScore} />
                    <ScoreRow label="Depth of Answer" score={gd.depthOfAnswerScore} max={gd.maxDepthOfAnswerScore} />
                    <ScoreRow label="Technical Fluency" score={gd.technicalBitcoinFluencyScore} max={gd.maxTechnicalBitcoinFluencyScore} />
                    <ScoreRow label="Engagement" score={gd.engagementScore} max={gd.maxEngagementScore} />
                    <ScoreRow label="Bonus Answer" score={gd.bonusAnswerScore} max={gd.maxBonusAnswerScore} />
                    <ScoreRow label="Bonus Followup" score={gd.bonusFollowupScore} max={gd.maxBonusFollowupScore} />
                  </Box>
                </Box>

                {/* Exercise Breakdown */}
                {hasExercises && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fb923c', mb: 1.5, fontSize: '0.85rem' }}>
                      Exercise
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <BooleanRow label="Submitted" value={ex.isSubmitted} points={10} />
                      <BooleanRow label="Tests Passing" value={ex.isPassing} points={50} />
                    </Box>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

const ScoreRow = ({ label, score, max }: { label: string; score: number; max: number }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" sx={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 80, bgcolor: '#1a1a1a', borderRadius: 1, height: 4, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            width: max > 0 ? `${(score / max) * 100}%` : '0%',
            bgcolor: '#f97316',
            borderRadius: 1,
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: '#fb923c', fontWeight: 600, fontSize: '0.8rem', minWidth: 36, textAlign: 'right' }}>
        {score}/{max}
      </Typography>
    </Box>
  </Box>
);

const BooleanRow = ({ label, value, points }: { label: string; value: boolean; points: number }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Typography variant="body2" sx={{ color: '#a1a1aa', fontSize: '0.85rem' }}>{label}</Typography>
    <Chip
      label={value ? `+${points} pts` : '0 pts'}
      size="small"
      sx={{
        bgcolor: value ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
        color: value ? '#4ade80' : '#52525b',
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 22,
      }}
    />
  </Box>
);

// Keep backward compat export
export const WeeklyBreakdownCard = WeeklyBreakdownList;
