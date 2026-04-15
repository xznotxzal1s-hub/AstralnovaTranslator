import { EmptyState } from "@/components/empty-state";
import { GlossaryManager } from "@/components/glossary-manager";
import { fetchGlossaryEntries } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function GlossaryPage() {
  const entries = await fetchGlossaryEntries();

  return (
    <main className="app-page">
      <section className="panel hero">
        <div>
          <p className="eyebrow">Glossary</p>
          <h1>Terminology you want to keep consistent</h1>
          <p className="lede">
            Add source terms, preferred translations, and optional notes for later translation refinement.
          </p>
        </div>
      </section>

      <GlossaryManager initialEntries={entries} />

      {entries.length === 0 ? (
        <EmptyState
          title="No glossary entries yet"
          description="Create an entry below to start building a simple terminology list."
        />
      ) : null}
    </main>
  );
}
