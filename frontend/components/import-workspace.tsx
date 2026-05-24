"use client";

import { BookOpen, FileText, Link2, Plus, Upload, X, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { CreateBookForm } from "@/components/create-book-form";
import { ImportBookForm } from "@/components/import-book-form";
import { ImportUrlForm } from "@/components/import-url-form";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

type ImportWorkspaceProps = {
  onChanged?: () => void | Promise<void>;
};

type ImportTab = "url" | "txt" | "epub" | "manual";

const importTabs: Array<{
  id: ImportTab;
  icon: LucideIcon;
  labelKey: "importUrlTab" | "importTxtTab" | "importEpubTab" | "importManualTab";
}> = [
  { id: "url", icon: Link2, labelKey: "importUrlTab" },
  { id: "txt", icon: FileText, labelKey: "importTxtTab" },
  { id: "epub", icon: BookOpen, labelKey: "importEpubTab" },
  { id: "manual", icon: Plus, labelKey: "importManualTab" },
];

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
        <Upload aria-hidden="true" size={18} />
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
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div aria-label={t("importLibraryTitle")} className="import-tabs" role="tablist">
              {importTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    aria-selected={activeTab === tab.id}
                    className={cn("import-tab", activeTab === tab.id && "active")}
                    role="tab"
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon aria-hidden="true" size={16} />
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
