"use client";

import { useState } from "react";

import { updateSettings } from "@/lib/api-client";
import type { TranslationSettings } from "@/lib/types";

type SettingsFormProps = {
  initialSettings: TranslationSettings;
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [formData, setFormData] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Key extends keyof TranslationSettings>(field: Key, value: TranslationSettings[Key]) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setIsSubmitting(true);
      const result = await updateSettings({
        provider_type: formData.provider_type,
        api_base_url: formData.api_base_url,
        api_key: formData.api_key,
        model_name: formData.model_name,
        prompt_template: formData.prompt_template,
        chunk_size: formData.chunk_size,
        translation_mode: formData.translation_mode,
      });
      setFormData(result);
      setMessage("Settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div>
        <h2>Provider configuration</h2>
        <p className="muted">These values are used by the translation endpoint.</p>
      </div>

      <div className="field">
        <label htmlFor="provider_type">Provider type</label>
        <select
          id="provider_type"
          value={formData.provider_type}
          onChange={(event) => updateField("provider_type", event.target.value as TranslationSettings["provider_type"])}
        >
          <option value="openai_compatible">OpenAI-compatible</option>
          <option value="gemini">Gemini</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="api_base_url">API base URL</label>
        <input
          id="api_base_url"
          value={formData.api_base_url}
          onChange={(event) => updateField("api_base_url", event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="api_key">API key</label>
        <input
          id="api_key"
          type="password"
          value={formData.api_key}
          onChange={(event) => updateField("api_key", event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="model_name">Model name</label>
        <input
          id="model_name"
          value={formData.model_name}
          onChange={(event) => updateField("model_name", event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="chunk_size">Chunk size</label>
        <input
          id="chunk_size"
          min={1}
          type="number"
          value={formData.chunk_size}
          onChange={(event) => updateField("chunk_size", Number(event.target.value))}
        />
      </div>

      <div className="field">
        <label htmlFor="translation_mode">Translation mode</label>
        <input
          id="translation_mode"
          value={formData.translation_mode}
          onChange={(event) => updateField("translation_mode", event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="prompt_template">Prompt template</label>
        <textarea
          id="prompt_template"
          value={formData.prompt_template}
          onChange={(event) => updateField("prompt_template", event.target.value)}
        />
      </div>

      <div className="action-row">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : "Save settings"}
        </button>
      </div>
      <p className={`feedback${message.toLowerCase().includes("fail") ? " error" : ""}`}>{message}</p>
    </form>
  );
}
