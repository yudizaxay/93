import { useEffect } from 'react';

/** @param enabled false keeps the cursor always visible (useful when testing
 * with a mouse instead of the arcade button) instead of auto-hiding it. */
export function useCursorAutoHide(enabled = true, timeoutMs = 3000): void {
  useEffect(() => {
    if (!enabled) {
      document.body.classList.add('cursor-visible');
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout>;

    const showCursor = () => {
      document.body.classList.add('cursor-visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        document.body.classList.remove('cursor-visible');
      }, timeoutMs);
    };

    window.addEventListener('mousemove', showCursor);
    return () => {
      window.removeEventListener('mousemove', showCursor);
      clearTimeout(hideTimer);
    };
  }, [enabled, timeoutMs]);
}
