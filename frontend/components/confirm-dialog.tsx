"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="confirm-backdrop" role="presentation" onMouseDown={() => !isSubmitting && onCancel()}>
      <section
        aria-modal="true"
        className="confirm-dialog"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-mark" aria-hidden="true" />
        <div className="confirm-dialog-copy">
          <p className="eyebrow">{title}</p>
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-actions">
          <Button variant="link" disabled={isSubmitting} type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="danger" aria-busy={isSubmitting} disabled={isSubmitting} type="button" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
