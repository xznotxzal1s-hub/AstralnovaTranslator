"use client";

import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import {
  activateSettingsPreset,
  createSettingsPreset,
  deleteSettingsPreset,
  updateSettingsPreset,
} from "@/lib/api-client";
import type { TranslationPreset, TranslationSettings } from "@/lib/types";

type SettingsFormProps = {
  initialSettings: TranslationSettings;
  initialPresets: TranslationPreset[];
};

type FormState = Omit<TranslationPreset, "id" | "updated_at" | "is_active">;

function toFormState(preset: TranslationPreset): FormState {
  return {
    name: preset.name,
    provider_type: preset.provider_type,
    api_base_url: preset.api_base_url,
    api_key: preset.api_key,
    model_name: preset.model_name,
    prompt_template: preset.prompt_template,
    chunk_size: preset.chunk_size,
    translation_mode: preset.translation_mode,
  };
}

export function SettingsForm({ initialSettings, initialPresets }: SettingsFormProps) {
  const { t } = useI18n();
  const [presets, setPresets] = useState(initialPresets);
  const [selectedPresetId, setSelectedPresetId] = useState(initialSettings.id);
  const [formData, setFormData] = useState<FormState>(toFormState(initialSettings));
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectPreset(preset: TranslationPreset) {
    setSelectedPresetId(preset.id);
    setFormData(toFormState(preset));
    setMessage("");
    setMessageType("");
  }

  function replacePreset(updatedPreset: TranslationPreset) {
    const nextPresets = presets.map((preset) => (preset.id === updatedPreset.id ? updatedPreset : preset));
    setPresets(nextPresets);
    selectPreset(updatedPreset);
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      setIsSubmitting(true);
      const result = await updateSettingsPreset(selectedPresetId, formData);
      replacePreset(result);
      setMessage(t("settingsSavedMessage"));
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settingsSaveFailed"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreatePreset() {
    setMessage("");
    setMessageType("");

    try {
      setIsSubmitting(true);
      const createdPreset = await createSettingsPreset(formData);
      setPresets((current) => [createdPreset, ...current]);
      selectPreset(createdPreset);
      setMessage(t("presetCreatedMessage"));
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("settingsSaveFailed"));
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleActivatePreset() {
    setMessage("");
    setMessageType("");

    try {
      setIsActivating(true);
      const activatedPreset = await activateSettingsPreset(selectedPresetId);
      setPresets((current) =>
        current.map((preset) => ({
          ...preset,
          is_active: preset.id === activatedPreset.id,
        })),
      );
      selectPreset({ ...activatedPreset, is_active: true });
      setMessage(t("presetActivatedMessage"));
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("presetActivateFailed"));
      setMessageType("error");
    } finally {
      setIsActivating(false);
    }
  }

  async function handleDeletePreset() {
    setMessage("");
    setMessageType("");

    try {
      setIsDeleting(true);
      await deleteSettingsPreset(selectedPresetId);
      const remainingPresets = presets.filter((preset) => preset.id !== selectedPresetId);
      const normalizedPresets =
        remainingPresets.some((preset) => preset.is_active) || remainingPresets.length === 0
          ? remainingPresets
          : remainingPresets.map((preset, index) => ({
              ...preset,
              is_active: index === 0,
            }));
      const nextSelectedPreset =
        normalizedPresets.find((preset) => preset.is_active) ?? normalizedPresets[0] ?? null;
      setPresets(normalizedPresets);
      if (nextSelectedPreset) {
        selectPreset(nextSelectedPreset);
      }
      setMessage(t("presetDeletedMessage"));
      setMessageType("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("presetDeleteFailed"));
      setMessageType("error");
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId) ?? presets[0];

  return (
    <section className="split-layout settings-layout">
      <aside className="form-card settings-presets-card">
        <div className="form-intro">
          <h2>{t("presetListTitle")}</h2>
          <p className="muted">{t("presetListDescription")}</p>
        </div>
        <div className="preset-list">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`preset-list-item${preset.id === selectedPresetId ? " active" : ""}`}
              onClick={() => selectPreset(preset)}
              type="button"
            >
              <span className="preset-list-copy">
                <strong>{preset.name}</strong>
                <span>{preset.model_name}</span>
              </span>
              {preset.is_active ? <span className="pill active-pill">{t("activePresetBadge")}</span> : null}
            </button>
          ))}
        </div>
      </aside>

      <form className="form-card settings-form-card" onSubmit={handleSave}>
        <div className="form-intro">
          <h2>{t("providerConfigurationTitle")}</h2>
          <p className="muted">{t("providerConfigurationDescription")}</p>
        </div>

        <section className="form-section-grid">
          <div className="field">
            <label htmlFor="preset_name">{t("presetNameLabel")}</label>
            <input
              id="preset_name"
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="provider_type">{t("providerTypeLabel")}</label>
            <select
              id="provider_type"
              value={formData.provider_type}
              onChange={(event) => updateField("provider_type", event.target.value as TranslationSettings["provider_type"])}
            >
              <option value="openai_compatible">{t("providerOpenAiCompatible")}</option>
              <option value="gemini">{t("providerGemini")}</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="model_name">{t("modelNameLabel")}</label>
            <input
              id="model_name"
              value={formData.model_name}
              onChange={(event) => updateField("model_name", event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="api_base_url">{t("apiBaseUrlLabel")}</label>
            <input
              id="api_base_url"
              value={formData.api_base_url}
              onChange={(event) => updateField("api_base_url", event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="api_key">{t("apiKeyLabel")}</label>
            <input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(event) => updateField("api_key", event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="chunk_size">{t("chunkSizeLabel")}</label>
            <input
              id="chunk_size"
              min={1}
              type="number"
              value={formData.chunk_size}
              onChange={(event) => updateField("chunk_size", Number(event.target.value))}
            />
          </div>

          <div className="field">
            <label htmlFor="translation_mode">{t("translationModeLabel")}</label>
            <input
              id="translation_mode"
              value={formData.translation_mode}
              onChange={(event) => updateField("translation_mode", event.target.value)}
            />
          </div>
        </section>

        <div className="field prompt-field">
          <label htmlFor="prompt_template">{t("promptTemplateLabel")}</label>
          <textarea
            id="prompt_template"
            value={formData.prompt_template}
            onChange={(event) => updateField("prompt_template", event.target.value)}
          />
        </div>

        <div className="preset-toolbar">
          <div className="action-row">
            <button className="button" disabled={isSubmitting} aria-busy={isSubmitting} type="submit">
              {isSubmitting ? t("savingLabel") : t("saveSettingsButton")}
            </button>
            <button
              className="button-secondary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handleCreatePreset}
              type="button"
            >
              {t("createPresetButton")}
            </button>
          </div>
          <div className="action-row">
            <button
              className="button-link"
              disabled={Boolean(selectedPreset?.is_active) || isActivating}
              aria-busy={isActivating}
              onClick={handleActivatePreset}
              type="button"
            >
              {t("activatePresetButton")}
            </button>
            <button
              className="button-danger"
              disabled={isDeleting || presets.length <= 1}
              aria-busy={isDeleting}
              onClick={handleDeletePreset}
              type="button"
            >
              {t("deletePresetButton")}
            </button>
          </div>
        </div>

        <p className={`feedback${messageType ? ` ${messageType}` : ""}`}>{message}</p>
      </form>
    </section>
  );
}
