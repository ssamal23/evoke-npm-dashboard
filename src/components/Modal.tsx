import { useId, useRef, type ReactNode } from 'react';
import { useDialog } from './useDialog';
import './Modal.css';

export interface ModalProps {
  /** Called on Esc, a click on the dimmed background, or the close button. */
  onClose: () => void;
  /** Heading. Also the dialog's accessible name. */
  title: ReactNode;
  /** Text under the heading. */
  description?: ReactNode;
  /** Icon shown in a tinted square before the title. */
  icon?: ReactNode;
  /** Tint of the icon square. Default "blue". */
  tone?: 'blue' | 'green';
  /** Dialog content. */
  children: ReactNode;
  /** Dialog width. Any CSS width; never wider than the screen. Default 520px. */
  width?: string;
  closeLabel?: string;
  /** Element to focus after closing. Defaults to whatever had focus when the dialog opened. */
  returnFocusTo?: HTMLElement | null;
}

// On open, focus goes to the first element in the content marked `data-autofocus`, otherwise the close button.

/**
 * A centred dialog over a dimmed background. Render it only while it should be open:
 * `{open && <Modal ...>}`. Esc, click-outside, focus trap, focus return and scroll lock come from `useDialog`.
 */
export function Modal({
  onClose,
  title,
  description,
  icon,
  tone = 'blue',
  children,
  width = '520px',
  closeLabel = 'Close',
  returnFocusTo,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onKeyDown = useDialog(panel, onClose, {
    returnFocusTo,
    initialFocus: () => panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? closeButton.current,
  });

  return (
    <div className="modal-root" onKeyDown={onKeyDown}>
      <div className="modal-scrim" onClick={onClose} />
      <div
        ref={panel}
        className="modal"
        style={{ width: `min(${width}, calc(100vw - 32px))` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <header className="modal-head">
          {icon && <span className={`modal-icon ${tone}`} aria-hidden="true">{icon}</span>}
          <div className="modal-heading">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descId}>{description}</p>}
          </div>
          <button ref={closeButton} type="button" className="modal-close" onClick={onClose} aria-label={closeLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
