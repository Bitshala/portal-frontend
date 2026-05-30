import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Link,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Info,
  Link2,
  ClipboardList,
  ExternalLink,
  Presentation,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { RenderWeek, ResolvedAttachment } from '../../types/instructions';
import { getAuthTokenFromStorage } from '../../services/authService';

const isImageFile = (filename: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);

const Attachment: React.FC<{ filename: string; url: string }> = ({ filename, url }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!isImageFile(filename)) return;
    let objectUrl: string;
    const token = getAuthTokenFromStorage();
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch(() => setImgFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url, filename]);

  if (isImageFile(filename) && !imgFailed) {
    return blobUrl ? (
      <Box
        component="img"
        src={blobUrl}
        alt={filename}
        sx={{ maxWidth: '100%', borderRadius: 2, border: '1px solid #3f3f46', display: 'block' }}
      />
    ) : null;
  }

  return (
    <Link href={url} target="_blank" rel="noopener noreferrer" sx={{ color: '#60a5fa', fontSize: '0.9rem' }}>
      {filename}
    </Link>
  );
};

interface InstructionsLayoutProps {
  displayName: string;
  links: { label: string; url: string }[];
  weeks: RenderWeek[];
  activeWeek: number | 'links' | 'exercises';
  setActiveWeek: (week: number | 'links' | 'exercises') => void;
  // Whether to show staff-only affordances (the GD presentation slideshow).
  canPresent: boolean;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  displayName,
  links,
  weeks,
  activeWeek,
  setActiveWeek,
  canPresent,
}) => {
  const navigate = useNavigate();
  const [showGDModal, setShowGDModal] = useState(false);
  const [gdSlideIndex, setGdSlideIndex] = useState(0);

  const currentWeekData = weeks.find(w => w.week === activeWeek);
  const exerciseWeeks = useMemo(() => weeks.filter(w => w.exercise), [weeks]);
  const hasExercisesTab = exerciseWeeks.length > 0;

  const allSlides = useMemo(() => {
    if (!currentWeekData) return [];
    const slides: { text: string; isBonus: boolean; attachments: ResolvedAttachment[] }[] = [];
    currentWeekData.questions.forEach(q => slides.push({ text: q.text, isBonus: false, attachments: q.attachments }));
    currentWeekData.bonusQuestions.forEach(q => slides.push({ text: q.text, isBonus: true, attachments: q.attachments }));
    return slides;
  }, [currentWeekData]);

  const handleOpenGDModal = useCallback(() => {
    setGdSlideIndex(0);
    setShowGDModal(true);
  }, []);

  const handleCloseGDModal = useCallback(() => {
    setShowGDModal(false);
  }, []);

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
                    {canPresent && currentWeek.questions.length > 0 && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Presentation size={16} />}
                        onClick={handleOpenGDModal}
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

      {/* GD Questions PPT Modal — staff only */}
      {canPresent && (
        <Dialog
          open={showGDModal}
          onClose={handleCloseGDModal}
          maxWidth="lg"
          fullWidth
          slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(8px)', bgcolor: 'rgba(0,0,0,0.75)' } },
          }}
          PaperProps={{
            sx: {
              bgcolor: '#111113',
              backgroundImage: 'none',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
              minHeight: 520,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              setGdSlideIndex(prev => Math.min(prev + 1, allSlides.length - 1));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              setGdSlideIndex(prev => Math.max(prev - 1, 0));
            }
          }}
        >
          {/* Header */}
          <Box sx={{ px: 3.5, pt: 3, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#fafafa', fontSize: '1.6rem', letterSpacing: '-0.01em' }}>
                GD Questions &mdash; Week {activeWeek}
              </Typography>
              <Typography sx={{ color: '#71717a', fontSize: '0.95rem', mt: 0.5 }}>
                {allSlides.length > 0
                  ? `${currentWeekData?.questions.length ?? 0} questions${(currentWeekData?.bonusQuestions.length ?? 0) > 0 ? ` + ${currentWeekData!.bonusQuestions.length} bonus` : ''}`
                  : 'No questions available for this week'}
              </Typography>
            </Box>
            <IconButton onClick={handleCloseGDModal} size="small" sx={{ color: '#52525b', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.06)' } }}>
              <X size={18} />
            </IconButton>
          </Box>

          {/* Slide Body */}
          <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 3, sm: 5 }, py: 4 }}>
            {allSlides.length > 0 ? (
              <Box sx={{ width: '100%', textAlign: 'center' }}>
                {/* Bonus badge */}
                {allSlides[gdSlideIndex]?.isBonus && (
                  <Box sx={{
                    display: 'inline-block',
                    bgcolor: 'rgba(59,130,246,0.15)',
                    color: '#60a5fa',
                    px: 2, py: 0.5,
                    borderRadius: 2,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    mb: 2,
                  }}>
                    Bonus Question
                  </Box>
                )}

                {/* Question number */}
                <Typography sx={{
                  color: allSlides[gdSlideIndex]?.isBonus ? '#60a5fa' : '#f97316',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  mb: 2,
                }}>
                  {allSlides[gdSlideIndex]?.isBonus
                    ? `Bonus Q${gdSlideIndex - (currentWeekData?.questions.length ?? 0) + 1}.`
                    : `Q${gdSlideIndex + 1}.`}
                </Typography>

                {/* Question text */}
                <Typography sx={{
                  color: '#fafafa',
                  fontSize: { xs: '1.3rem', sm: '1.65rem' },
                  fontWeight: 400,
                  lineHeight: 1.7,
                  maxWidth: 800,
                  mx: 'auto',
                  whiteSpace: 'pre-line',
                }}>
                  {allSlides[gdSlideIndex]?.text}
                </Typography>

                {/* Attachments if present */}
                {(allSlides[gdSlideIndex]?.attachments?.length ?? 0) > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    {allSlides[gdSlideIndex].attachments.map((a) => <Attachment key={a.filename} {...a} />)}
                  </Box>
                )}
              </Box>
            ) : (
              <Typography sx={{ color: '#52525b', fontSize: '1.1rem' }}>
                No questions available for this week.
              </Typography>
            )}
          </DialogContent>

          {/* Footer Navigation */}
          {allSlides.length > 0 && (
            <DialogActions sx={{
              px: 3.5, pb: 3, pt: 1.5,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Button
                onClick={() => setGdSlideIndex(prev => Math.max(prev - 1, 0))}
                disabled={gdSlideIndex === 0}
                startIcon={<ChevronLeft size={16} />}
                sx={{
                  color: '#a1a1aa',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)' },
                  '&.Mui-disabled': { color: '#3f3f46' },
                }}
              >
                Prev
              </Button>

              <Typography sx={{ color: '#71717a', fontSize: '1rem', fontWeight: 500 }}>
                {gdSlideIndex + 1} / {allSlides.length}
              </Typography>

              <Button
                onClick={() => setGdSlideIndex(prev => Math.min(prev + 1, allSlides.length - 1))}
                disabled={gdSlideIndex === allSlides.length - 1}
                endIcon={<ChevronRight size={16} />}
                sx={{
                  color: '#a1a1aa',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.04)' },
                  '&.Mui-disabled': { color: '#3f3f46' },
                }}
              >
                Next
              </Button>
            </DialogActions>
          )}
        </Dialog>
      )}
    </Box>
  );
};

export default InstructionsLayout;
