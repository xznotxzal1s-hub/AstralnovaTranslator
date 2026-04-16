import { EmptyState } from "@/components/empty-state";
import { GlossaryManager } from "@/components/glossary-manager";
import { fetchGlossaryEntries } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const entries = await fetchGlossaryEntries();
  const { messages } = await getServerI18n();

  return (
    <main className="app-page">
      <section className="panel section-panel page-masthead">
        <div className="page-masthead-copy">
          <p className="eyebrow">{messages.glossaryEyebrow}</p>
          <h1>{messages.glossaryTitle}</h1>
          <p className="lede">{messages.glossaryDescription}</p>
          <p className="page-lead">{messages.glossaryLead}</p>
        </div>
        <div className="info-card">
          <p className="eyebrow">{messages.glossaryListTitle}</p>
          <p>{messages.glossaryDescription}</p>
        </div>
      </section>

      <GlossaryManager initialEntries={entries} scope="global" />

      {entries.length === 0 ? (
        <EmptyState title={messages.noGlossaryTitle} description={messages.noGlossaryDescription} />
      ) : null}
    </main>
  );
}
