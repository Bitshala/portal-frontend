import { useCallback, useEffect, useState } from 'react';

// Wraps the Fullscreen API for a given element. `enter`/`exit` must be called
// from a user gesture (browser requirement). State stays in sync with the
// browser via the fullscreenchange event (e.g. when the user presses Esc).
export const useFullscreen = (ref: React.RefObject<HTMLElement | null>) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enter = useCallback(() => {
    const el = ref.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => { /* ignore — gesture/permission denied */ });
    }
  }, [ref]);

  const exit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => { /* ignore */ });
    }
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) exit();
    else enter();
  }, [enter, exit]);

  return { isFullscreen, enter, exit, toggle };
};

// Holds a screen wake lock while `active` is true, so the display doesn't sleep
// mid-presentation. Re-acquires the lock when the tab becomes visible again
// (the browser releases it on tab switch). No-ops where the API is unavailable.
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (!wakeLockApi) return;

    let sentinel: { release: () => Promise<void> } | null = null;
    let released = false;

    const acquire = async () => {
      try {
        sentinel = await wakeLockApi.request('screen');
      } catch {
        /* ignore — not granted */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !released) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => { /* ignore */ });
    };
  }, [active]);
};
