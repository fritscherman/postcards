import { useCallback, useRef } from 'react';

/** Fire `onLongPress` once the pointer is held still for `ms`. The returned
 *  `didLongPress()` lets the caller suppress the click that follows, so a
 *  normal tap still selects while a long hold triggers the long-press action. */
export function useLongPress(onLongPress: () => void, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    fired.current = false;
    clear();
    timer.current = setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, ms);
  }, [onLongPress, ms, clear]);

  return {
    handlers: {
      onPointerDown: start,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
    },
    didLongPress: () => fired.current,
  };
}
