import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./icons";

export function Modal({
  title,
  onClose,
  children,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (dialog && !dialog.open) dialog.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      closeRef.current();
    };
    dialog?.addEventListener("cancel", cancel);
    return () => {
      dialog?.removeEventListener("cancel", cancel);
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      className={`dialog ${className}`}
    >
      <header className="dialog-header">
        <h1 id="dialog-title">{title}</h1>
        <button
          type="button"
          className="close-button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
          autoFocus
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
