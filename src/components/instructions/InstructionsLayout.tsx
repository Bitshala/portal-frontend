import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Link,
  Button,
  IconButton,
} from '@mui/material';
import {
  Info,
  Link2,
  ClipboardList,
  ExternalLink,
  Presentation,
} from 'lucide-react';
import type { RenderWeek } from '../../types/instructions';
import Attachment from './Attachment';

interface InstructionsLayoutProps {
  displayName: string;
  links: { label: string; url: string }[];
  weeks: RenderWeek[];
  activeWeek: number | 'links' | 'exercises';
  setActiveWeek: (week: number | 'links' | 'exercises') => void;
  // Cohort id, used to build the GD presentation route (/:cohortId/present/:week).
  cohortId?: string;
  // Whether to show staff-only affordances (the GD presentation).
  canPresent: boolean;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  displayName,
  links,
  weeks,
  activeWeek,
  setActiveWeek,
  cohortId,
  canPresent,
}) => {
  const navigate = useNavigate();

  const currentWeekData = weeks.find(w => w.week === activeWeek);
  const exerciseWeeks = useMemo(() => weeks.filter(w => w.exercise), [weeks]);
  const hasExercisesTab = exerciseWeeks.length > 0;

  const handlePresent = (weekId: string, newTab = false) => {
    const url = `/${cohortId}/present/${weekId}`;
    if (newTab) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    // Request fullscreen on this user gesture; client-side navigation keeps the
    // same document, so the presentation page opens already in fullscreen.
    document.documentElement.requestFullscreen?.().catch(() => { /* gesture/policy denied */ });
    navigate(url);
  };

  const activeChipSx = {
    bgcolor: '#ea580c',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    height: 34,
    cursor: 'pointer',
    '& .MuiChip-icon': { color: '#fff' },
    '&:hover': { bgcolor: '#c2410c' },
  };

  const inactiveChipSx = {
    bgcolor: '#27272a',
    color: '#a1a1aa',
    fontWeight: 500,
    fontSize: '0.9rem',
    height: 34,
    cursor: 'pointer',
    border: '1px solid #3f3f46',
    '& .MuiChip-icon': { color: '#a1a1aa' },
    '&:hover': { bgcolor: '#3f3f46', color: '#e4e4e7' },
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa' }}>
      {/* Top Header */}
      <Box sx={{ borderBottom: '1px solid #27272a', px: { xs: 2, sm: 3, md: 4 }, py: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
          {displayName}
        </Typography>
      </Box>

      {/* Navigation Bar */}
      <Box
        sx={{
          borderBottom: '1px solid #27272a',
          px: { xs: 2, sm: 3, md: 4 },
          py: 1.5,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: '#3f3f46', borderRadius: 2 },
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', minWidth: 'max-content' }}>
          {/* General Instructions */}
          <Chip
            icon={<Info size={16} />}
            label="General Instructions"
            onClick={() => navigate('/general-instructions')}
            sx={inactiveChipSx}
          />

          {/* Links */}
          <Chip
            icon={<Link2 size={16} />}
            label="Links"
            onClick={() => setActiveWeek('links')}
            sx={activeWeek === 'links' ? activeChipSx : inactiveChipSx}
          />

          {/* Exercises — shown when any week has an exercise */}
          {hasExercisesTab && (
            <Chip
              icon={<ClipboardList size={16} />}
              label="Exercises"
              onClick={() => setActiveWeek('exercises')}
              sx={activeWeek === 'exercises' ? activeChipSx : inactiveChipSx}
            />
          )}

          {/* Week Chips */}
          {weeks.map((week) => (
            <Chip
              key={week.week}
              label={`Week ${week.week}`}
              onClick={() => setActiveWeek(week.week)}
              sx={activeWeek === week.week ? activeChipSx : inactiveChipSx}
            />
          ))}
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 6 }, py: { xs: 3, md: 5 }, maxWidth: 900, mx: 'auto' }}>
        {activeWeek === 'exercises' ? (
          /* Exercises Content */
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Exercises
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {exerciseWeeks.map((week, i) => {
                const ex = week.exercise!;
                const num = i + 1;
                const link = week.classroomAssignmentUrl;
                return (
                  <Paper key={week.week} elevation={0} sx={{ bgcolor: 'rgba(39,39,42,0.5)', border: '1px solid #3f3f46', borderRadius: 2, p: { xs: 3, md: 4 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fb923c', mb: 2, fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
                      Exercise {num}: {ex.title}
                    </Typography>
                    {link && (
                      <Link href={link} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2, fontSize: '1rem' }}>
                        Exercise {num} Assignment <ExternalLink size={14} />
                      </Link>
                    )}
                    <Typography variant="body2" sx={{ color: '#d4d4d8', mb: 2 }}>
                      <strong style={{ color: '#fafafa' }}>Concepts:</strong> {ex.concepts}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 600, mb: 1 }}>Problem Statement:</Typography>
                    <Typography variant="body2" sx={{ color: '#d4d4d8', mb: 2, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{ex.problem}</Typography>
                    <Typography variant="body2" sx={{ color: '#fafafa', fontWeight: 600, mb: 1 }}>Expected Output:</Typography>
                    <Box component="ul" sx={{ pl: 3, m: 0 }}>
                      {ex.expectedOutput.map((item, idx) => (
                        <Typography key={idx} component="li" variant="body2" sx={{ color: '#d4d4d8', mb: 0.5, lineHeight: 1.6 }}>{item}</Typography>
                      ))}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        ) : activeWeek === 'links' ? (
          /* Links Content */
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', mb: 4, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Frequently Accessed Links
            </Typography>
            {links.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {links.map((link) => (
                  <Link key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: '#fafafa', display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '1.1rem', '&:hover': { color: '#fb923c' } }}>
                    {link.label} <ExternalLink size={16} />
                  </Link>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: '#71717a', fontSize: '1rem' }}>No links available.</Typography>
            )}
          </Box>
        ) : (
          /* Week Questions Content */
          <>
            {currentWeekData && (() => {
              const currentWeek = currentWeekData;
              const assignmentLink = currentWeek.classroomAssignmentUrl;

              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {/* Title + Present Button */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                      {currentWeek.title ?? `Week ${currentWeek.week}`}
                    </Typography>
                    {canPresent && cohortId && currentWeek.questions.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<Presentation size={16} />}
                          onClick={() => handlePresent(currentWeek.id)}
                          sx={{
                            bgcolor: '#fb923c',
                            '&:hover': { bgcolor: '#f97316' },
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            boxShadow: 'none',
                            borderRadius: 2,
                            px: 2,
                          }}
                        >
                          Present GD Questions
                        </Button>
                        <IconButton
                          size="small"
                          title="Open presentation in new tab"
                          onClick={() => handlePresent(currentWeek.id, true)}
                          sx={{ color: '#a1a1aa', border: '1px solid #3f3f46', borderRadius: 2, '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.06)' } }}
                        >
                          <ExternalLink size={16} />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  {/* Assignment */}
                  {(assignmentLink || currentWeek.classroomInviteLink) && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Assignment
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {assignmentLink && (
                          <Chip
                            label={`Week ${currentWeek.week} Assignment`}
                            component="a"
                            href={assignmentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(96,165,250,0.12)',
                              color: '#93c5fd',
                              border: '1px solid rgba(96,165,250,0.25)',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(96,165,250,0.2)', color: '#bfdbfe' },
                            }}
                          />
                        )}
                        {currentWeek.classroomInviteLink && (
                          <Chip
                            label="Classroom Invite"
                            component="a"
                            href={currentWeek.classroomInviteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(74,222,128,0.12)',
                              color: '#86efac',
                              border: '1px solid rgba(74,222,128,0.25)',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(74,222,128,0.2)', color: '#bbf7d0' },
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Reading Material */}
                  {currentWeek.readingMaterial.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: '#a1a1aa', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Reading Material
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {currentWeek.readingMaterial.map((link, i) => (
                          <Chip
                            key={i}
                            label={link.label}
                            component="a"
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            clickable
                            sx={{
                              bgcolor: 'rgba(251,146,60,0.1)',
                              color: '#fdba74',
                              border: '1px solid rgba(251,146,60,0.2)',
                              fontWeight: 500,
                              fontSize: '0.85rem',
                              height: 36,
                              '&:hover': { bgcolor: 'rgba(251,146,60,0.18)', color: '#fed7aa' },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Questions */}
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#fb923c', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                    List of Questions
                  </Typography>

                  {/* Group Round */}
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', mb: 3 }}>Group Round</Typography>
                    <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {currentWeek.questions.map((question, index) => (
                        <Box key={index} component="li">
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Typography sx={{ color: '#fb923c', fontWeight: 600, mr: 1.5, mt: 0.1, minWidth: 24, fontSize: '1.1rem' }}>
                              {index + 1}.
                            </Typography>
                            <Typography sx={{ color: '#e4e4e7', lineHeight: 1.7, fontSize: '1.1rem' }}>
                              {question.text}
                            </Typography>
                          </Box>
                          {question.attachments.length > 0 && (
                            <Box sx={{ ml: 4.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {question.attachments.map((a) => <Attachment key={a.filename} {...a} />)}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  {/* Bonus Round — present only when bonus questions are available
                      (server returns [] for students) */}
                  {currentWeek.bonusQuestions.length > 0 && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa', mb: 3 }}>Bonus Round</Typography>
                      <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {currentWeek.bonusQuestions.map((question, index) => (
                          <Box key={index} component="li">
                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                              <Typography sx={{ color: '#60a5fa', fontWeight: 600, mr: 1.5, mt: 0.1, minWidth: 24, fontSize: '1.1rem' }}>
                                {index + 1}.
                              </Typography>
                              <Typography sx={{ color: '#e4e4e7', lineHeight: 1.7, fontSize: '1.1rem', whiteSpace: 'pre-line' }}>
                                {question.text}
                              </Typography>
                            </Box>
                            {question.attachments.length > 0 && (
                              <Box sx={{ ml: 4.5, mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {question.attachments.map((a) => <Attachment key={a.filename} {...a} />)}
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Activity */}
                  {currentWeek.activity && (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#60a5fa', mb: 2 }}>Activity</Typography>
                      <Typography sx={{ color: '#e4e4e7', fontSize: '1.1rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                        {currentWeek.activity}
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </>
        )}
      </Box>

    </Box>
  );
};

export default InstructionsLayout;
