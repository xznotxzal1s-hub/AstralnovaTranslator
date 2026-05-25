"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { updateBook } from "@/lib/api-client";

type BookTitleEditorProps = {
  bookId: number;
  initialTitle: string;
};

export function BookTitleEditor({ bookId, initialTitle }: BookTitleEditorProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [title, setTitle] = useState(initialTitle);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setMessage(t("enterBookTitleError"));
      setMessageType("error");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      const updatedBook = await updateBook(bookId, nextTitle);
      setTitle(updatedBook.title);
      setDraftTitle(updatedBook.title);
      setIsEditing(false);
      setMessage(t("bookTitleUpdatedMessage"));
      setMessageType("success");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("bookTitleUpdateError"));
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraftTitle(title);
    setIsEditing(false);
    setMessage("");
    setMessageType("");
  }

  return (
    <div className="book-title-editor">
      {isEditing ? (
        <form className="inline-edit-form" onSubmit={handleSubmit}>
          <FormField htmlFor="book-title-editor" label={t("editBookTitleLabel")}>
            <input
              id="book-title-editor"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder={t("bookTitlePlaceholder")}
            />
          </FormField>
          <div className="action-row compact-actions">
            <Button type="submit" disabled={isSaving} aria-busy={isSaving}>
              {isSaving ? t("savingLabel") : t("saveBookTitleButton")}
            </Button>
            <Button variant="link" type="button" onClick={handleCancel} disabled={isSaving}>
              {t("cancelEditBookTitle")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="title-display-row">
          <h1>{title}</h1>
          <Button variant="link" type="button" onClick={() => setIsEditing(true)}>
            {t("editBookTitleButton")}
          </Button>
        </div>
      )}

      <FeedbackMessage message={message} type={messageType} />
    </div>
  );
}
