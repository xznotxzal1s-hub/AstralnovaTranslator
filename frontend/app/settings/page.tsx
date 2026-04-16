import { SettingsForm } from "@/components/settings-form";
import { fetchSettings, fetchSettingsPresets } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, presets] = await Promise.all([fetchSettings(), fetchSettingsPresets()]);
  const { messages } = await getServerI18n();

  return (
    <main className="app-page">
      <section className="panel section-panel page-masthead">
        <div className="page-masthead-copy">
          <p className="eyebrow">{messages.settingsEyebrow}</p>
          <h1>{messages.settingsTitle}</h1>
          <p className="lede">{messages.settingsDescription}</p>
          <p className="page-lead">{messages.settingsLead}</p>
        </div>
        <div className="info-card">
          <p className="eyebrow">{messages.settingsTipsTitle}</p>
          <p>{messages.settingsTipsBody}</p>
        </div>
      </section>

      <SettingsForm initialSettings={settings} initialPresets={presets} />
    </main>
  );
}
