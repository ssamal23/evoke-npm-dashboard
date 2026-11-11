import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import './SlideOver.css';

export interface SlideOverProps {
  /** Called when the user presses Esc, clicks the dimmed background or the close button. */
  onClose: () => void;
  /** Main heading. Also used as the dialog's accessible name. */
  title: ReactNode;
  /** Small label above the title, e.g. "Version". */
  eyebrow?: ReactNode;
  /** Line below the title. */
  subtitle?: ReactNode;
  /** Content of the scrolling body. */
  children: ReactNode;
  /** Fixed bar at the bottom (buttons). Omit for no footer. */
  footer?: ReactNode;
  /** Panel width. Any CSS width; it never exceeds the screen. Default 560px. */
  width?: string;
  /** Accessible label of the close button. */
  closeLabel?: string;
  /** Element to focus after closing. Defaults to whatever had focus when the panel opened. */
  returnFocusTo?: HTMLElement | null;
}

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * A panel that slides in from the right over a dimmed background.
 * Render it only while it should be open: `{open && <SlideOver ...>}`.
 *
 * Handles: Esc to close, click outside to close, focus moves into the panel and is trapped there,
 * focus returns to the opener on close, page scroll is locked, and reduced-motion is respected.
 */
export function SlideOver({
  onClose,
  title,
  eyebrow,
  subtitle,
  children,
  footer,
  width = '560px',
  closeLabel = 'Close',
  returnFocusTo,
}: SlideOverProps) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      const target = returnFocusTo ?? opener.current;
      setTimeout(() => target?.focus(), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
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

  return (
    <div className="slideover-root" onKeyDown={onKeyDown}>
      <div className="slideover-scrim" onClick={onClose} />
      <aside
        ref={panel}
        className="slideover"
        style={{ width: `min(${width}, 100vw)` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="slideover-head">
          <div>
            {eyebrow && <div className="slideover-eyebrow">{eyebrow}</div>}
            <h2 id={titleId} className="slideover-title">{title}</h2>
            {subtitle && <div className="slideover-subtitle">{subtitle}</div>}
          </div>
          <button ref={closeButton} type="button" className="slideover-close" onClick={onClose} aria-label={closeLabel}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="slideover-body">{children}</div>
        {footer && <footer className="slideover-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
