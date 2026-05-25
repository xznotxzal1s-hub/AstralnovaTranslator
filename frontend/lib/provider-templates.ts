import type { MessageKey } from "@/lib/i18n";
import type { TranslationSettings } from "@/lib/types";

export type ProviderTemplate = {
  id: string;
  nameKey: MessageKey;
  helpKey: MessageKey;
  provider_type: TranslationSettings["provider_type"];
  api_base_url: string;
  modelExamples: string[];
  apiKeyRequired: boolean;
  dockerNote?: boolean;
};

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
  {
    id: "openai-compatible-generic",
    nameKey: "providerTemplateOpenAiGeneric",
    helpKey: "providerTemplateOpenAiGenericHelp",
    provider_type: "openai_compatible",
    api_base_url: "https://api.openai.com/v1",
    modelExamples: ["gpt-4o-mini", "provider-model-name"],
    apiKeyRequired: true,
  },
  {
    id: "deepseek",
    nameKey: "providerTemplateDeepSeek",
    helpKey: "providerTemplateDeepSeekHelp",
    provider_type: "openai_compatible",
    api_base_url: "https://api.deepseek.com",
    modelExamples: ["deepseek-chat", "deepseek-reasoner"],
    apiKeyRequired: true,
  },
  {
    id: "openrouter",
    nameKey: "providerTemplateOpenRouter",
    helpKey: "providerTemplateOpenRouterHelp",
    provider_type: "openai_compatible",
    api_base_url: "https://openrouter.ai/api/v1",
    modelExamples: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
    apiKeyRequired: true,
  },
  {
    id: "siliconflow",
    nameKey: "providerTemplateSiliconFlow",
    helpKey: "providerTemplateSiliconFlowHelp",
    provider_type: "openai_compatible",
    api_base_url: "https://api.siliconflow.cn/v1",
    modelExamples: ["Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-V3"],
    apiKeyRequired: true,
  },
  {
    id: "gemini-native",
    nameKey: "providerTemplateGeminiNative",
    helpKey: "providerTemplateGeminiNativeHelp",
    provider_type: "gemini",
    api_base_url: "https://generativelanguage.googleapis.com/v1beta",
    modelExamples: ["gemini-1.5-flash", "gemini-1.5-pro"],
    apiKeyRequired: true,
  },
  {
    id: "gemini-openai",
    nameKey: "providerTemplateGeminiOpenAi",
    helpKey: "providerTemplateGeminiOpenAiHelp",
    provider_type: "openai_compatible",
    api_base_url: "https://generativelanguage.googleapis.com/v1beta/openai/",
    modelExamples: ["gemini-1.5-flash", "gemini-1.5-pro"],
    apiKeyRequired: true,
  },
  {
    id: "ollama",
    nameKey: "providerTemplateOllama",
    helpKey: "providerTemplateOllamaHelp",
    provider_type: "openai_compatible",
    api_base_url: "http://localhost:11434/v1",
    modelExamples: ["llama3.1", "qwen2.5"],
    apiKeyRequired: false,
    dockerNote: true,
  },
  {
    id: "lm-studio",
    nameKey: "providerTemplateLmStudio",
    helpKey: "providerTemplateLmStudioHelp",
    provider_type: "openai_compatible",
    api_base_url: "http://localhost:1234/v1",
    modelExamples: ["local-model"],
    apiKeyRequired: false,
    dockerNote: true,
  },
];
