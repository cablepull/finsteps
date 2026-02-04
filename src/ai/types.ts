// AI Model Configuration Types

export type ModelProvider = "openai" | "anthropic" | "ollama" | "local";

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
}

export interface OllamaConfig extends ModelConfig {
  provider: "ollama";
  baseUrl: string; // e.g., "http://localhost:11434"
}

export interface ModelManagerConfig {
  defaultModel: string;
  models: ModelConfig[];
  ollama?: {
    baseUrl: string;
    autoDetectModels?: boolean;
  };
}

export interface ModelChatRequest {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  };
}

export interface ModelChatResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string;
    };
    finishReason: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelManager {
  // Model management
  getAvailableModels(): ModelConfig[];
  getModel(id: string): ModelConfig | undefined;
  addModel(model: ModelConfig): void;
  removeModel(id: string): void;
  setDefaultModel(modelId: string): void;
  
  // Chat functionality
  chat(request: ModelChatRequest): Promise<ModelChatResponse>;
  
  // Ollama specific
  detectOllamaModels(): Promise<string[]>;
  pullOllamaModel(model: string): Promise<void>;
  
  // Configuration
  loadConfig(config: ModelManagerConfig): void;
  saveConfig(): ModelManagerConfig;
}