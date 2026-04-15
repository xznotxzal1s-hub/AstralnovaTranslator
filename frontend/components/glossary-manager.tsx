"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { createGlossaryEntry, deleteGlossaryEntry, updateGlossaryEntry } from "@/lib/api-client";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  function beginEdit(entry: GlossaryEntry) {
    setEditingId(entry.id);
    setFormData({
      source_term: entry.source_term,
      target_term: entry.target_term,
      note: entry.note ?? "",
    });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setIsSubmitting(true);
      if (editingId === null) {
        const created = await createGlossaryEntry({ ...formData, bookId });
        setEntries((current) => [created, ...current]);
        setMessage(t("glossaryEntryCreated"));
      } else {
        const updated = await updateGlossaryEntry(editingId, formData);
        setEntries((current) => current.map((entry) => (entry.id === editingId ? updated : entry)));
        setMessage(t("glossaryEntryUpdated"));
      }

      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("glossarySaveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(entryId: number) {
    setMessage("");
    try {
      setIsSubmitting(true);
      await deleteGlossaryEntry(entryId);
      setEntries((current) => current.filter((entry) => entry.id !== entryId));
      if (editingId === entryId) {
        resetForm();
      }
      setMessage(t("glossaryEntryDeleted"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("glossaryDeleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="split-layout">
      <form className="form-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">{scope === "global" ? t("glossaryGlobalScope") : t("glossaryBookScope")}</p>
          <h2>{editingId === null ? t("glossaryCreateTitle") : t("glossaryEditTitle")}</h2>
          <p className="muted">{t("glossaryFormDescription")}</p>
        </div>

        <div className="field">
          <label htmlFor="source_term">{t("glossarySourceLabel")}</label>
          <input
            id="source_term"
            value={formData.source_term}
            onChange={(event) => setFormData((current) => ({ ...current, source_term: event.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="target_term">{t("glossaryTargetLabel")}</label>
          <input
            id="target_term"
            value={formData.target_term}
            onChange={(event) => setFormData((current) => ({ ...current, target_term: event.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="note">{t("glossaryNoteLabel")}</label>
          <textarea
            id="note"
            value={formData.note}
            onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
          />
        </div>

        <div className="action-row">
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("savingLabel") : editingId === null ? t("glossaryCreateButton") : t("glossarySaveButton")}
          </button>
          {editingId !== null ? (
            <button className="button-link" onClick={resetForm} type="button">
              {t("glossaryCancel")}
            </button>
          ) : null}
        </div>
        <p
          className={`feedback${message === t("glossarySaveFailed") || message === t("glossaryDeleteFailed") ? " error" : ""}`}
        >
          {message}
        </p>
      </form>

      <section className="list-stack">
        {entries.map((entry) => (
          <article className="chapter-card" key={entry.id}>
            <div>
              <p className="eyebrow">{t("glossaryEntryLabel")}</p>
              <h3>
                {entry.source_term} → {entry.target_term}
              </h3>
            </div>
            <p className="muted">{entry.note?.trim() ? entry.note : t("glossaryNoNote")}</p>
            <div className="action-row">
              <button className="button-secondary" disabled={isSubmitting} onClick={() => beginEdit(entry)} type="button">
                {t("glossaryEdit")}
              </button>
              <button className="button-link" disabled={isSubmitting} onClick={() => handleDelete(entry.id)} type="button">
                {t("glossaryDelete")}
              </button>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
