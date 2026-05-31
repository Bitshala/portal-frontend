import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, ShieldCheck } from 'lucide-react';

import { useCohort } from '../hooks/cohortHooks';
import { toRenderWeeks } from '../helpers/cohortHelpers';
import { buildPresentationSlides, type PresentationSlide } from '../helpers/presentation';
import { useFullscreen, useWakeLock } from '../hooks/presentationHooks';
import Attachment from '../components/instructions/Attachment';

const ORANGE = '#fb923c';
const BLUE = '#60a5fa';
const IDLE_MS = 2500;

// Eyebrow label shown above the slide body, varies by slide kind.
const slideEyebrow = (slide: PresentationSlide): { text: string; color: string } | null => {
  switch (slide.kind) {
    case 'question':
      return { text: `Question ${slide.number}`, color: ORANGE };
    case 'bonus':
      return { text: `Bonus Question ${slide.number}`, color: BLUE };
    case 'safety':
      return { text: 'Bonus Round', color: ORANGE };
    default:
      return null;
  }
};

// Short text used for the aria-live announcement and the section chip.
const slideSection = (slide: PresentationSlide): string => {
  switch (slide.kind) {
    case 'intro': return 'Intro';
    case 'question': return `Question ${slide.number}`;
    case 'safety': return 'Reminder';
    case 'bonus': return `Bonus ${slide.number}`;
    case 'end': return 'End';
  }
};

const GDPresentation: React.FC = () => {
  const { cohortId, weekId } = useParams<{ cohortId: string; weekId: string }>();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen, enter: enterFullscreen, exit: exitFullscreen } = useFullscreen(containerRef);

  const { data: cohortData, isLoading } = useCohort(cohortId);

  const slides = useMemo<PresentationSlide[]>(() => {
    if (!cohortData) return [];
    const weekData = toRenderWeeks(cohortData).find((w) => w.id === weekId);
    if (!weekData) return [];
    return buildPresentationSlides(weekData, cohortData.displayName);
  }, [cohortData, weekId]);

  const [index, setIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const idleTimer = useRef<number | null>(null);

  // Keep the screen awake for the whole presentation.
  useWakeLock(slides.length > 0);

  // Default to fullscreen. The Present button already requests fullscreen on the
  // click that navigates here (it carries through SPA navigation); this best-effort
  // attempt covers direct links / new-tab opens that had no prior gesture. We only
  // auto-enter once — if the presenter exits, we don't force them back in.
  useEffect(() => {
    if (slides.length > 0 && !document.fullscreenElement) enterFullscreen();
  }, [slides.length, enterFullscreen]);

  // Clamp the index if the deck shrinks (e.g. data refetch).
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  const goBack = useCallback(() => {
    if (cohortId) navigate(`/${cohortId}/instructions`);
    else navigate(-1);
  }, [cohortId, navigate]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Reveal controls on activity, then auto-hide after a period of stillness.
  const nudgeControls = useCallback(() => {
    setControlsVisible(true);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setControlsVisible(false), IDLE_MS);
  }, []);

  useEffect(() => {
    nudgeControls();
    return () => { if (idleTimer.current) window.clearTimeout(idleTimer.current); };
  }, [nudgeControls]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Home':
          e.preventDefault();
          setIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setIndex(slides.length - 1);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'Escape':
          // While fullscreen the browser handles Esc itself; otherwise leave.
          if (!document.fullscreenElement) goBack();
          break;
      }
      nudgeControls();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, slides.length, toggleFullscreen, goBack, nudgeControls]);

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: ORANGE }} />
      </Box>
    );
  }

  if (slides.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, px: 3, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '1.25rem', color: '#a1a1aa' }}>
          No questions available to present for this week.
        </Typography>
        <IconButton onClick={goBack} sx={{ color: '#a1a1aa', border: '1px solid #3f3f46', borderRadius: 2, px: 2, fontSize: '0.95rem', gap: 1 }}>
          <X size={18} /> Back to instructions
        </IconButton>
      </Box>
    );
  }

  const slide = slides[index];
  const eyebrow = slideEyebrow(slide);

  return (
    <Box
      ref={containerRef}
      onMouseMove={nudgeControls}
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: slide.kind === 'safety' ? '#0a0a0a' : '#000',
        color: '#fafafa',
        overflow: 'hidden',
        cursor: controlsVisible ? 'default' : 'none',
        transition: 'background-color 300ms ease',
      }}
    >
      {/* Click zones — left third = prev, right third = next */}
      <Box onClick={prev} sx={{ position: 'absolute', left: 0, top: 0, width: '33%', height: '100%', zIndex: 1 }} />
      <Box onClick={next} sx={{ position: 'absolute', right: 0, top: 0, width: '33%', height: '100%', zIndex: 1 }} />

      {/* Slide body (fades in on change) */}
      <Box
        key={index}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: { xs: 4, md: 10 },
          py: 12,
          '@keyframes gdFadeIn': {
            from: { opacity: 0, transform: 'translateY(12px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
          animation: 'gdFadeIn 320ms ease',
        }}
      >
        {slide.kind === 'intro' && (
          <>
            <Typography sx={{ color: ORANGE, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)', mb: 3 }}>
              Group Discussion
            </Typography>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: 'clamp(2.5rem, 6vw, 5rem)', maxWidth: 1200 }}>
              {slide.title ?? `Week ${slide.week}`}
            </Typography>
            <Typography sx={{ color: '#a1a1aa', mt: 3, fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
              {slide.displayName} · Week {slide.week}
            </Typography>
          </>
        )}

        {(slide.kind === 'question' || slide.kind === 'bonus') && (
          <>
            {eyebrow && (
              <Typography sx={{ color: eyebrow.color, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)', mb: 4 }}>
                {eyebrow.text}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 500, lineHeight: 1.35, fontSize: 'clamp(1.75rem, 4.5vw, 3.75rem)', maxWidth: 1300, whiteSpace: 'pre-line' }}>
              {slide.text}
            </Typography>
            {slide.attachments.length > 0 && (
              <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'auto' }}>
                {slide.attachments.map((a) => (
                  <Attachment key={a.filename} {...a} imgSx={{ maxHeight: '42vh', maxWidth: '80vw' }} />
                ))}
              </Box>
            )}
          </>
        )}

        {slide.kind === 'safety' && (
          <>
            <ShieldCheck size={64} color={ORANGE} style={{ marginBottom: 24 }} />
            {eyebrow && (
              <Typography sx={{ color: ORANGE, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 'clamp(0.85rem, 1.4vw, 1.1rem)', mb: 4 }}>
                {eyebrow.text}
              </Typography>
            )}
            <Typography sx={{ fontWeight: 800, lineHeight: 1.2, fontSize: 'clamp(2.25rem, 5.5vw, 4.5rem)', maxWidth: 1200, color: '#fafafa' }}>
              {slide.text}
            </Typography>
          </>
        )}

        {slide.kind === 'end' && (
          <>
            <Typography sx={{ fontWeight: 800, lineHeight: 1.1, fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
              Discussion 🎉
            </Typography>
            <Typography sx={{ color: '#a1a1aa', mt: 3, fontSize: 'clamp(1rem, 2vw, 1.5rem)' }}>
              Thanks for participating!
            </Typography>
          </>
        )}
      </Box>

      {/* aria-live announcer (visually hidden) */}
      <Box aria-live="polite" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {`${slideSection(slide)}, slide ${index + 1} of ${slides.length}`}
      </Box>

      {/* Top-right controls */}
      <Box
        sx={{
          position: 'absolute', top: 16, right: 16, zIndex: 20,
          display: 'flex', gap: 1,
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 250ms ease',
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        <IconButton onClick={toggleFullscreen} size="small" sx={{ color: '#a1a1aa', bgcolor: 'rgba(255,255,255,0.04)', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </IconButton>
        <IconButton onClick={() => { exitFullscreen(); goBack(); }} size="small" sx={{ color: '#a1a1aa', bgcolor: 'rgba(255,255,255,0.04)', '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <X size={18} />
        </IconButton>
      </Box>

      {/* Bottom control bar */}
      <Box
        sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          px: { xs: 2, md: 4 }, pb: 2, pt: 6,
          background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          opacity: controlsVisible ? 1 : 0,
          transition: 'opacity 250ms ease',
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        {/* Progress bar */}
        <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.12)', mb: 2, overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${((index + 1) / slides.length) * 100}%`, bgcolor: ORANGE, transition: 'width 250ms ease' }} />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton onClick={prev} disabled={index === 0} sx={{ color: '#d4d4d8', '&.Mui-disabled': { color: '#3f3f46' } }}>
            <ChevronLeft size={22} />
          </IconButton>

          <Typography sx={{ color: '#a1a1aa', fontSize: '0.95rem', fontWeight: 500 }}>
            {slideSection(slide)} · {index + 1} / {slides.length}
          </Typography>

          <IconButton onClick={next} disabled={index === slides.length - 1} sx={{ color: '#d4d4d8', '&.Mui-disabled': { color: '#3f3f46' } }}>
            <ChevronRight size={22} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default GDPresentation;
