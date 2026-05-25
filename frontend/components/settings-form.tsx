"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { FeedbackMessage } from "@/components/feedback-message";
import { useI18n } from "@/components/i18n-provider";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  activateSettingsPreset,
  createSettingsPreset,
  deleteSettingsPreset,
  fetchProviderModels,
  testProviderConnection,
  updateSettingsPreset,
  validatePromptTemplate,
} from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n";
import { PROVIDER_TEMPLATES } from "@/lib/provider-templates";
import type { TranslationPreset, TranslationSettings } from "@/lib/types";

type SettingsFormProps = {
  initialSettings: TranslationSettings;
  initialPresets: TranslationPreset[];
};

type FormState = Omit<TranslationPreset, "id" | "updated_at" | "is_active" | "has_api_key">;

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
    request_timeout_seconds: preset.request_timeout_seconds,
    retry_count: preset.retry_count,
    retry_backoff_seconds: preset.retry_backoff_seconds,
    rate_limit_delay_ms: preset.rate_limit_delay_ms,
    temperature: preset.temperature,
    max_output_tokens: preset.max_output_tokens,
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
  const [isTestingProvider, setIsTestingProvider] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  function updateField<Key extends keyof FormState>(field: Key, value: FormState[Key]) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectPreset(preset: TranslationPreset) {
    setSelectedPresetId(preset.id);
    setFormData(toFormState(preset));
    setSelectedTemplateId("");
    setModelOptions([]);
    setMessage("");
    setMessageType("");
  }

  function replacePreset(updatedPreset: TranslationPreset) {
    const nextPresets = presets.map((preset) => (preset.id === updatedPreset.id ? updatedPreset : preset));
    setPresets(nextPresets);
    selectPreset(updatedPreset);
  }

  function applyProviderTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = PROVIDER_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    setFormData((current) => ({
      ...current,
      provider_type: template.provider_type,
      api_base_url: template.api_base_url,
      model_name: template.modelExamples[0] ?? current.model_name,
    }));
    setModelOptions(template.modelExamples);
    setMessage(t("providerTemplateApplied"));
    setMessageType("success");
  }

  async function validatePromptBeforeSubmit() {
    const validation = await validatePromptTemplate(formData.prompt_template);
    if (validation.is_valid) {
      return true;
    }

    setMessage(validation.errors.join(" "));
    setMessageType("error");
    return false;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageType("");

    try {
      setIsSubmitting(true);
      if (!(await validatePromptBeforeSubmit())) {
        return;
      }
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
      if (!(await validatePromptBeforeSubmit())) {
        return;
      }
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

  async function handleTestProvider() {
    setMessage("");
    setMessageType("");

    try {
      setIsTestingProvider(true);
      const result = await testProviderConnection({
        preset_id: selectedPresetId,
        provider_type: formData.provider_type,
        api_base_url: formData.api_base_url,
        api_key: formData.api_key,
        model_name: formData.model_name,
        request_timeout_seconds: formData.request_timeout_seconds,
        temperature: formData.temperature,
        max_output_tokens: formData.max_output_tokens,
      });
      const latency = result.latency_ms == null ? "" : ` (${result.latency_ms} ms)`;
      setMessage(result.success ? `${t("providerTestSuccess")}${latency}` : `${t("providerTestFailed")} ${result.detail ?? result.message}`);
      setMessageType(result.success ? "success" : "error");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("providerTestFailed"));
      setMessageType("error");
    } finally {
      setIsTestingProvider(false);
    }
  }

  async function handleFetchModels() {
    setMessage("");
    setMessageType("");

    try {
      setIsFetchingModels(true);
      const result = await fetchProviderModels({
        preset_id: selectedPresetId,
        provider_type: formData.provider_type,
        api_base_url: formData.api_base_url,
        api_key: formData.api_key,
        request_timeout_seconds: formData.request_timeout_seconds,
      });
      setModelOptions(result.models);
      if (result.success && result.models.length > 0) {
        setMessage(t("modelListFetched"));
        setMessageType("success");
      } else {
        setMessage(`${t("modelListFetchFailed")} ${result.detail ?? result.message}`);
        setMessageType("error");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("modelListFetchFailed"));
      setMessageType("error");
    } finally {
      setIsFetchingModels(false);
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
      setIsDeleteConfirmOpen(false);
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
  const selectedTemplate = PROVIDER_TEMPLATES.find((template) => template.id === selectedTemplateId);

  return (
    <section className="split-layout settings-layout">
      <aside className="form-card settings-presets-card">
        <div className="form-intro">
          <h2>{t("presetListTitle")}</h2>
          <p className="muted">{t("presetListDescription")}</p>
        </div>
        <div className="preset-list">
          {presets.map((preset, index) => (
            <button
              key={preset.id}
              className={`preset-list-item${preset.id === selectedPresetId ? " active" : ""}`}
              onClick={() => selectPreset(preset)}
              type="button"
            >
              <span className="preset-list-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="preset-list-copy">
                <strong>{preset.name}</strong>
                <span>{preset.model_name}</span>
              </span>
              {preset.is_active ? <span className="pill active-pill">{t("activePresetBadge")}</span> : null}
            </button>
          ))}
        </div>
        <div className="settings-backup-card">
          <p className="eyebrow">{t("backupExportEyebrow")}</p>
          <h3>{t("backupExportTitle")}</h3>
          <p className="muted">{t("backupExportDescription")}</p>
          <p className="backup-warning">{t("backupExportWarning")}</p>
          <a className={buttonClassName("secondary")} download href="/api/backend/backup/export">
            {t("backupExportButton")}
          </a>
        </div>
      </aside>

      <form className="form-card settings-form-card" onSubmit={handleSave}>
        <div className="form-intro">
          <h2>{t("providerConfigurationTitle")}</h2>
          <p className="muted">{t("providerConfigurationDescription")}</p>
        </div>

        <section className="provider-setup-section">
          <FormField
            htmlFor="provider_template"
            label={t("providerTemplateLabel")}
            helpText={selectedTemplate ? t(selectedTemplate.helpKey) : t("providerTemplateHelp")}
          >
            <select
              id="provider_template"
              value={selectedTemplateId}
              onChange={(event) => applyProviderTemplate(event.target.value)}
            >
              <option value="">{t("providerTemplatePlaceholder")}</option>
              {PROVIDER_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {t(template.nameKey)}
                </option>
              ))}
            </select>
          </FormField>
          {selectedTemplate ? (
            <div className="provider-template-note">
              <p>
                {selectedTemplate.apiKeyRequired
                  ? t("providerTemplateApiKeyRequired")
                  : t("providerTemplateApiKeyOptional")}
              </p>
              <p>
                {formatMessage(t("providerTemplateModels"), {
                  models: selectedTemplate.modelExamples.join(", "),
                })}
              </p>
              {selectedTemplate.dockerNote ? <p>{t("providerTemplateDockerNote")}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="form-section-grid">
          <FormField htmlFor="preset_name" label={t("presetNameLabel")}>
            <input
              id="preset_name"
              value={formData.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </FormField>

          <FormField htmlFor="provider_type" label={t("providerTypeLabel")}>
            <select
              id="provider_type"
              value={formData.provider_type}
              onChange={(event) => updateField("provider_type", event.target.value as TranslationSettings["provider_type"])}
            >
              <option value="openai_compatible">{t("providerOpenAiCompatible")}</option>
              <option value="gemini">{t("providerGemini")}</option>
            </select>
          </FormField>

          <FormField htmlFor="model_name" label={t("modelNameLabel")}>
            <input
              list="provider-model-options"
              id="model_name"
              value={formData.model_name}
              onChange={(event) => updateField("model_name", event.target.value)}
            />
            {modelOptions.length > 0 ? (
              <datalist id="provider-model-options">
                {modelOptions.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            ) : null}
          </FormField>

          <FormField htmlFor="api_base_url" label={t("apiBaseUrlLabel")}>
            <input
              id="api_base_url"
              value={formData.api_base_url}
              onChange={(event) => updateField("api_base_url", event.target.value)}
            />
          </FormField>

          <FormField htmlFor="api_key" label={t("apiKeyLabel")}>
            <input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(event) => updateField("api_key", event.target.value)}
            />
          </FormField>

          <FormField htmlFor="chunk_size" label={t("chunkSizeLabel")}>
            <input
              id="chunk_size"
              min={1}
              type="number"
              value={formData.chunk_size}
              onChange={(event) => updateField("chunk_size", Number(event.target.value))}
            />
          </FormField>

          <FormField htmlFor="translation_mode" label={t("translationModeLabel")}>
            <input
              id="translation_mode"
              value={formData.translation_mode}
              onChange={(event) => updateField("translation_mode", event.target.value)}
            />
          </FormField>
        </section>

        <div className="provider-action-panel">
          <div>
            <p className="eyebrow">{t("providerToolsTitle")}</p>
            <p className="muted">{t("providerToolsDescription")}</p>
          </div>
          <div className="action-row">
            <Button
              variant="secondary"
              disabled={isTestingProvider}
              aria-busy={isTestingProvider}
              onClick={handleTestProvider}
              type="button"
            >
              {isTestingProvider ? t("testingProviderLabel") : t("testProviderButton")}
            </Button>
            <Button
              variant="link"
              disabled={isFetchingModels}
              aria-busy={isFetchingModels}
              onClick={handleFetchModels}
              type="button"
            >
              {isFetchingModels ? t("fetchingModelsLabel") : t("fetchModelsButton")}
            </Button>
          </div>
        </div>

        <details className="advanced-provider-options">
          <summary>{t("advancedProviderOptionsSummary")}</summary>
          <section className="form-section-grid">
            <FormField htmlFor="request_timeout_seconds" label={t("requestTimeoutLabel")}>
              <input
                id="request_timeout_seconds"
                min={1}
                max={300}
                type="number"
                value={formData.request_timeout_seconds}
                onChange={(event) => updateField("request_timeout_seconds", Number(event.target.value))}
              />
            </FormField>
            <FormField htmlFor="retry_count" label={t("retryCountLabel")}>
              <input
                id="retry_count"
                min={0}
                max={5}
                type="number"
                value={formData.retry_count}
                onChange={(event) => updateField("retry_count", Number(event.target.value))}
              />
            </FormField>
            <FormField htmlFor="retry_backoff_seconds" label={t("retryBackoffLabel")}>
              <input
                id="retry_backoff_seconds"
                min={0}
                max={60}
                type="number"
                value={formData.retry_backoff_seconds}
                onChange={(event) => updateField("retry_backoff_seconds", Number(event.target.value))}
              />
            </FormField>
            <FormField htmlFor="rate_limit_delay_ms" label={t("rateLimitDelayLabel")}>
              <input
                id="rate_limit_delay_ms"
                min={0}
                max={60000}
                type="number"
                value={formData.rate_limit_delay_ms}
                onChange={(event) => updateField("rate_limit_delay_ms", Number(event.target.value))}
              />
            </FormField>
            <FormField htmlFor="temperature" label={t("temperatureLabel")}>
              <input
                id="temperature"
                min={0}
                max={2}
                step={0.1}
                type="number"
                value={formData.temperature ?? ""}
                onChange={(event) =>
                  updateField("temperature", event.target.value === "" ? null : Number(event.target.value))
                }
              />
            </FormField>
            <FormField htmlFor="max_output_tokens" label={t("maxOutputTokensLabel")}>
              <input
                id="max_output_tokens"
                min={1}
                placeholder={t("maxOutputTokensPlaceholder")}
                type="number"
                value={formData.max_output_tokens ?? ""}
                onChange={(event) =>
                  updateField("max_output_tokens", event.target.value === "" ? null : Number(event.target.value))
                }
              />
            </FormField>
          </section>
        </details>

        <FormField className="prompt-field" htmlFor="prompt_template" label={t("promptTemplateLabel")}>
          <textarea
            id="prompt_template"
            value={formData.prompt_template}
            onChange={(event) => updateField("prompt_template", event.target.value)}
          />
        </FormField>

        <div className="preset-toolbar">
          <div className="action-row">
            <Button disabled={isSubmitting} aria-busy={isSubmitting} type="submit">
              {isSubmitting ? t("savingLabel") : t("saveSettingsButton")}
            </Button>
            <Button
              variant="secondary"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handleCreatePreset}
              type="button"
            >
              {t("createPresetButton")}
            </Button>
          </div>
          <div className="action-row">
            <Button
              variant="link"
              disabled={Boolean(selectedPreset?.is_active) || isActivating}
              aria-busy={isActivating}
              onClick={handleActivatePreset}
              type="button"
            >
              {t("activatePresetButton")}
            </Button>
            <Button
              variant="danger"
              disabled={isDeleting || presets.length <= 1}
              aria-busy={isDeleting}
              onClick={() => setIsDeleteConfirmOpen(true)}
              type="button"
            >
              {t("deletePresetButton")}
            </Button>
          </div>
        </div>

        <FeedbackMessage message={message} type={messageType} />
      </form>
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("confirmDialogTitle")}
        message={formatMessage(t("confirmDeletePreset"), { name: selectedPreset?.name ?? formData.name })}
        cancelLabel={t("confirmDialogCancel")}
        confirmLabel={t("confirmDialogConfirm")}
        isSubmitting={isDeleting}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeletePreset}
      />
    </section>
  );
}
