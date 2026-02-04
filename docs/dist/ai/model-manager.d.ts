import type { ModelConfig, ModelChatRequest, ModelChatResponse, ModelManager, ModelManagerConfig } from './types.js';
export declare class DefaultModelManager implements ModelManager {
    private models;
    private defaultModelId;
    private config;
    constructor();
    private initializeDefaultModels;
    getAvailableModels(): ModelConfig[];
    getModel(id: string): ModelConfig | undefined;
    addModel(model: ModelConfig): void;
    removeModel(id: string): void;
    setDefaultModel(modelId: string): void;
    chat(request: ModelChatRequest): Promise<ModelChatResponse>;
    private chatWithOllama;
    private chatWithOpenAI;
    private chatWithAnthropic;
    detectOllamaModels(): Promise<string[]>;
    pullOllamaModel(model: string): Promise<void>;
    loadConfig(config: ModelManagerConfig): void;
    saveConfig(): ModelManagerConfig;
    private generateId;
}
export declare const modelManager: DefaultModelManager;
//# sourceMappingURL=model-manager.d.ts.map