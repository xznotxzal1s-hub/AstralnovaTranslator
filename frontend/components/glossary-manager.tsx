"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { createGlossaryEntry, deleteGlossaryEntry, updateGlossaryEntry } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import type { GlossaryEntry } from "@/lib/types";

type GlossaryManagerProps = {
  initialEntries: GlossaryEntry[];
  scope: "global" | "book";
  bookId?: number;
};

type EntryFormState = {
  source_term: string;
  target_term: string;
  note: string;
};

const emptyForm: EntryFormState = {
  source_term: "",
  target_term: "",
  note: "",
};

export function GlossaryManager({ initialEntries, scope, bookId }: GlossaryManagerProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState(initialEntries);
  const [formData, setFormData] = useState<EntryFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [entryToDelete, setEntryToDelete] = useState<GlossaryEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function beginEdit(entry: GlossaryEntry) {
    setEditingId(entry.id);
    setFormData({
      source_term: entry.source_term,
      target_term: entry.target_term,
      note: entry.note ?? "",
    });
    setMessage("");
    setMessageType("");
  }

  function resetForm() {
    setEditingId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      setIsSubmitting(true);
      if (editingId === null) {
        const created = await createGlossaryEntry({ ...formData, bookId });
        setEntries((current) => [created, ...current]);
        setMessage(t("glossaryEntryCreated"));
        setMessageType("success");
      } else {
        const updated = await updateGlossaryEntry(editingId, formData);
        setEntries((current) => current.map((entry) => (entry.id === editingId ? updated : entry)));
        setMessage(t("glossaryEntryUpdated"));
        setMessageType("success");
      }

      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("glossarySaveFailed"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (entryToDelete === null) {
      return;
    }

    setMessage("");
    setMessageType("");
    try {
      setIsSubmitting(true);
      await deleteGlossaryEntry(entryToDelete.id);
      setEntries((current) => current.filter((entry) => entry.id !== entryToDelete.id));
      if (editingId === entryToDelete.id) {
        resetForm();
      }
      setEntryToDelete(null);
      setMessage(t("glossaryEntryDeleted"));
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("glossaryDeleteFailed"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="split-layout glossary-layout">
      <form className="form-card glossary-form-card" onSubmit={handleSubmit}>
        <div className="form-intro">
          <p className="eyebrow">{scope === "global" ? t("glossaryGlobalScope") : t("glossaryBookScope")}</p>
          <h2>{editingId === null ? t("glossaryCreateTitle") : t("glossaryEditTitle")}</h2>
          <p className="muted">{t("glossaryFormDescription")}</p>
        </div>

        <FormField htmlFor="source_term" label={t("glossarySourceLabel")}>
          <input
            id="source_term"
            value={formData.source_term}
            onChange={(event) => setFormData((current) => ({ ...current, source_term: event.target.value }))}
          />
        </FormField>

        <FormField htmlFor="target_term" label={t("glossaryTargetLabel")}>
          <input
            id="target_term"
            value={formData.target_term}
            onChange={(event) => setFormData((current) => ({ ...current, target_term: event.target.value }))}
          />
        </FormField>

        <FormField htmlFor="note" label={t("glossaryNoteLabel")}>
          <textarea
            id="note"
            value={formData.note}
            onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
          />
        </FormField>

        <div className="action-row">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? t("savingLabel") : editingId === null ? t("glossaryCreateButton") : t("glossarySaveButton")}
          </Button>
          {editingId !== null ? (
            <Button variant="link" onClick={resetForm} type="button">
              {t("glossaryCancel")}
            </Button>
          ) : null}
        </div>
        <FeedbackMessage message={message} type={messageType} />
      </form>

      <section className="list-stack glossary-list-section">
        <div className="section-header">
          <div>
            <h2>{t("glossaryListTitle")}</h2>
            <p>{scope === "global" ? t("glossaryDescription") : t("glossaryBookDescription")}</p>
          </div>
        </div>
        {entries.length === 0 ? (
          <EmptyState title={t("noGlossaryTitle")} description={t("noGlossaryDescription")} />
        ) : (
          entries.map((entry) => (
            <article className="chapter-card glossary-entry-card" key={entry.id}>
              <div className="card-heading glossary-entry-heading">
                <p className="eyebrow">{t("glossaryEntryLabel")}</p>
                <h3>
                  <span>{entry.source_term}</span>
                  <span aria-hidden="true">-&gt;</span>
                  <span>{entry.target_term}</span>
                </h3>
              </div>
              <p className="muted">{entry.note?.trim() ? entry.note : t("glossaryNoNote")}</p>
              <div className="action-row">
                <Button variant="secondary" disabled={isSubmitting} onClick={() => beginEdit(entry)} type="button">
                  {t("glossaryEdit")}
                </Button>
                <Button variant="link" disabled={isSubmitting} onClick={() => setEntryToDelete(entry)} type="button">
                  {t("glossaryDelete")}
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
      <ConfirmDialog
        open={entryToDelete !== null}
        title={t("confirmDialogTitle")}
        message={formatMessage(t("confirmDeleteGlossaryEntry"), { term: entryToDelete?.source_term ?? "" })}
        cancelLabel={t("confirmDialogCancel")}
        confirmLabel={t("confirmDialogConfirm")}
        isSubmitting={isSubmitting}
        onCancel={() => setEntryToDelete(null)}
        onConfirm={handleDelete}
      />
    </section>
  );
}
