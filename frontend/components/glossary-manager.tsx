"use client";

import { useState } from "react";

import { createGlossaryEntry, deleteGlossaryEntry, updateGlossaryEntry } from "@/lib/api-client";
import type { GlossaryEntry } from "@/lib/types";

type GlossaryManagerProps = {
  initialEntries: GlossaryEntry[];
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

export function GlossaryManager({ initialEntries }: GlossaryManagerProps) {
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
        const created = await createGlossaryEntry(formData);
        setEntries((current) => [created, ...current]);
        setMessage("Glossary entry created.");
      } else {
        const updated = await updateGlossaryEntry(editingId, formData);
        setEntries((current) => current.map((entry) => (entry.id === editingId ? updated : entry)));
        setMessage("Glossary entry updated.");
      }

      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save glossary entry.");
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
      setMessage("Glossary entry deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete glossary entry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="split-layout">
      <form className="form-card" onSubmit={handleSubmit}>
        <div>
          <h2>{editingId === null ? "Create entry" : "Edit entry"}</h2>
          <p className="muted">Keep preferred translations and optional notes in one simple list.</p>
        </div>

        <div className="field">
          <label htmlFor="source_term">Source term</label>
          <input
            id="source_term"
            value={formData.source_term}
            onChange={(event) => setFormData((current) => ({ ...current, source_term: event.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="target_term">Target term</label>
          <input
            id="target_term"
            value={formData.target_term}
            onChange={(event) => setFormData((current) => ({ ...current, target_term: event.target.value }))}
          />
        </div>

        <div className="field">
          <label htmlFor="note">Note (optional)</label>
          <textarea
            id="note"
            value={formData.note}
            onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
          />
        </div>

        <div className="action-row">
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : editingId === null ? "Create entry" : "Save changes"}
          </button>
          {editingId !== null ? (
            <button className="button-link" onClick={resetForm} type="button">
              Cancel edit
            </button>
          ) : null}
        </div>
        <p className={`feedback${message.toLowerCase().includes("fail") ? " error" : ""}`}>{message}</p>
      </form>

      <section className="list-stack">
        {entries.map((entry) => (
          <article className="chapter-card" key={entry.id}>
            <div>
              <p className="eyebrow">Glossary Entry</p>
              <h3>
                {entry.source_term} → {entry.target_term}
              </h3>
            </div>
            <p className="muted">{entry.note?.trim() ? entry.note : "No note."}</p>
            <div className="action-row">
              <button className="button-secondary" disabled={isSubmitting} onClick={() => beginEdit(entry)} type="button">
                Edit
              </button>
              <button className="button-link" disabled={isSubmitting} onClick={() => handleDelete(entry.id)} type="button">
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
