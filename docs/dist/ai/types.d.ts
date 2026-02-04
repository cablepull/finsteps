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
    baseUrl: string;
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
    getAvailableModels(): ModelConfig[];
    getModel(id: string): ModelConfig | undefined;
    addModel(model: ModelConfig): void;
    removeModel(id: string): void;
    setDefaultModel(modelId: string): void;
    chat(request: ModelChatRequest): Promise<ModelChatResponse>;
    detectOllamaModels(): Promise<string[]>;
    pullOllamaModel(model: string): Promise<void>;
    loadConfig(config: ModelManagerConfig): void;
    saveConfig(): ModelManagerConfig;
}
//# sourceMappingURL=types.d.ts.map