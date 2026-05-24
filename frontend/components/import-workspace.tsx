"use client";

import { type ReactNode, useState } from "react";

import { CreateBookForm } from "@/components/create-book-form";
import { ImportBookForm } from "@/components/import-book-form";
import { ImportUrlForm } from "@/components/import-url-form";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type ImportWorkspaceProps = {
  onChanged?: () => void | Promise<void>;
};

type ImportTab = "url" | "txt" | "epub" | "manual";
type ImportGlyphName = "url" | "txt" | "epub" | "manual" | "upload" | "close";

const importTabs: Array<{
  id: ImportTab;
  glyph: ImportGlyphName;
  labelKey: "importUrlTab" | "importTxtTab" | "importEpubTab" | "importManualTab";
}> = [
  { id: "url", glyph: "url", labelKey: "importUrlTab" },
  { id: "txt", glyph: "txt", labelKey: "importTxtTab" },
  { id: "epub", glyph: "epub", labelKey: "importEpubTab" },
  { id: "manual", glyph: "manual", labelKey: "importManualTab" },
];

function ImportGlyph({ name }: { name: ImportGlyphName }) {
  const paths: Record<ImportGlyphName, ReactNode> = {
    url: (
      <>
        <path d="M9.5 7.5 7.8 5.8a3.2 3.2 0 0 0-4.5 4.5L5 12" />
        <path d="m8 10 4 4" />
        <path d="m10.5 16.5 1.7 1.7a3.2 3.2 0 0 0 4.5-4.5L15 12" />
      </>
    ),
    txt: (
      <>
        <path d="M6 3.8h8l4 4V20H6z" />
        <path d="M14 3.8V8h4" />
        <path d="M8.5 12h7" />
        <path d="M8.5 15.5h5" />
      </>
    ),
    epub: (
      <>
        <path d="M5 5.2c2.6-.8 4.7-.5 7 1v12.3c-2.3-1.5-4.4-1.8-7-1z" />
        <path d="M12 6.2c2.3-1.5 4.4-1.8 7-1v12.3c-2.6-.8-4.7-.5-7 1" />
      </>
    ),
    manual: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 4v10" />
        <path d="m8 8 4-4 4 4" />
        <path d="M5 17.5h14" />
      </>
    ),
    close: (
      <>
        <path d="M6 6 18 18" />
        <path d="M18 6 6 18" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" className="ui-glyph" fill="none" viewBox="0 0 24 24">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}

export function ImportWorkspace({ onChanged }: ImportWorkspaceProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportTab>("url");

  async function handleChanged() {
    await onChanged?.();
    setIsOpen(false);
  }

  return (
    <>
      <button
        aria-expanded={isOpen}
        className="button import-launch-button"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <ImportGlyph name="upload" />
        {t("importLibraryButton")}
      </button>

      {isOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-modal="true" className="import-dialog" role="dialog">
            <div className="import-dialog-header">
              <div>
                <p className="eyebrow">{t("importEyebrow")}</p>
                <h2>{t("importLibraryTitle")}</h2>
                <p className="muted">{t("importLibrarySubtitle")}</p>
              </div>
              <button
                aria-label={t("closeDialog")}
                className="icon-button"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                <ImportGlyph name="close" />
              </button>
            </div>

            <div aria-label={t("importLibraryTitle")} className="import-tabs" role="tablist">
              {importTabs.map((tab) => {
                return (
                  <button
                    key={tab.id}
                    aria-selected={activeTab === tab.id}
                    className={cn("import-tab", activeTab === tab.id && "active")}
                    role="tab"
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <ImportGlyph name={tab.glyph} />
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            <div className="import-dialog-body">
              {activeTab === "url" ? <ImportUrlForm onSuccess={handleChanged} /> : null}
              {activeTab === "txt" ? (
                <ImportBookForm
                  accept=".txt,text/plain"
                  description={t("importTxtDescription")}
                  endpoint="txt"
                  onSuccess={handleChanged}
                  title={t("importTxtTitle")}
                />
              ) : null}
              {activeTab === "epub" ? (
                <ImportBookForm
                  accept=".epub,application/epub+zip"
                  description={t("importEpubDescription")}
                  endpoint="epub"
                  onSuccess={handleChanged}
                  title={t("importEpubTitle")}
                />
              ) : null}
              {activeTab === "manual" ? <CreateBookForm onSuccess={handleChanged} /> : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
