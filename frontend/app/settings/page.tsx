import { SettingsForm } from "@/components/settings-form";
import { fetchSettings } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await fetchSettings();

  return (
    <main className="app-page">
      <section className="panel hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Translation settings</h1>
          <p className="lede">
            Configure the provider, model, prompt, and chunk size used when you translate chapters.
          </p>
        </div>
      </section>

      <SettingsForm initialSettings={settings} />
    </main>
  );
}
