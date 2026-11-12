import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared behaviour of dialogs (SlideOver, Modal):
 * moves focus in when opened, keeps Tab inside, closes on Esc, locks page scroll,
 * and puts focus back where it was when the dialog closes.
 *
 * Attach the returned handler to the dialog's outer element as `onKeyDown`.
 */
export function useDialog(
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: { returnFocusTo?: HTMLElement | null; initialFocus?: () => HTMLElement | null | undefined } = {},
) {
  // Kept in refs so React's development double-run of effects does not lose the real opener
  // or return focus while the dialog is still on screen.
  const opener = useRef<HTMLElement | null>(null);
  const restoreTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(restoreTimer.current);
    if (!opener.current) opener.current = document.activeElement as HTMLElement | null;
    options.initialFocus?.()?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      const target = options.returnFocusTo ?? opener.current;
      restoreTimer.current = setTimeout(() => target?.focus(), 0);
    };
    // Runs once per open. Dialogs are rendered only while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}
