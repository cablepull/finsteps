import type { ModelConfig, OllamaConfig, ModelChatRequest, ModelChatResponse, ModelManager, ModelManagerConfig } from './types.js';

export class DefaultModelManager implements ModelManager {
  private models: Map<string, ModelConfig> = new Map();
  private defaultModelId: string = '';
  private config: ModelManagerConfig;

  constructor() {
    this.config = {
      defaultModel: '',
      models: [],
      ollama: {
        baseUrl: 'http://localhost:11434',
        autoDetectModels: true
      }
    };
    this.initializeDefaultModels();
  }

  private initializeDefaultModels(): void {
    // Add default models
    const defaultModels: ModelConfig[] = [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true
      },
      {
        id: 'qwen3-coder-30b',
        name: 'Qwen3 Coder 30B (Ollama)',
        provider: 'ollama',
        model: 'qwen3-coder:30b',
        baseUrl: 'http://localhost:11434',
        maxTokens: 4096,
        temperature: 0.7,
        enabled: true
      }
    ];

    defaultModels.forEach(model => this.addModel(model));
    
    // Set first enabled model as default
    const firstEnabled = defaultModels.find(m => m.enabled);
    if (firstEnabled) {
      this.defaultModelId = firstEnabled.id;
      this.config.defaultModel = firstEnabled.id;
    }
  }

  // Model management
  getAvailableModels(): ModelConfig[] {
    return Array.from(this.models.values()).filter(m => m.enabled);
  }

  getModel(id: string): ModelConfig | undefined {
    return this.models.get(id);
  }

  addModel(model: ModelConfig): void {
    this.models.set(model.id, model);
    this.config.models = Array.from(this.models.values());
  }

  removeModel(id: string): void {
    this.models.delete(id);
    this.config.models = Array.from(this.models.values());
    
    // Update default if removed
    if (this.defaultModelId === id) {
      const firstEnabled = this.getAvailableModels()[0];
      if (firstEnabled) {
        this.setDefaultModel(firstEnabled.id);
      }
    }
  }

  setDefaultModel(modelId: string): void {
    if (this.models.has(modelId)) {
      this.defaultModelId = modelId;
      this.config.defaultModel = modelId;
    }
  }

  // Chat functionality
  async chat(request: ModelChatRequest): Promise<ModelChatResponse> {
    const model = this.getModel(request.model);
    if (!model) {
      throw new Error(`Model ${request.model} not found`);
    }

    switch (model.provider) {
      case 'ollama':
        return this.chatWithOllama(model as OllamaConfig, request);
      case 'openai':
        return this.chatWithOpenAI(model, request);
      case 'anthropic':
        return this.chatWithAnthropic(model, request);
      default:
        throw new Error(`Provider ${model.provider} not supported`);
    }
  }

  private async chatWithOllama(config: OllamaConfig, request: ModelChatRequest): Promise<ModelChatResponse> {
    const response = await fetch(`${config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        stream: false, // Disable streaming for simpler response handling
        options: {
          num_predict: request.options?.maxTokens || config.maxTokens,
          temperature: request.options?.temperature || config.temperature,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id || this.generateId(),
      model: config.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.message?.content || ''
        },
        finishReason: data.done ? 'stop' : 'length'
      }],
      usage: data.prompt_eval_count && data.eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: data.prompt_eval_count + data.eval_count
      } : undefined
    };
  }

  private async chatWithOpenAI(config: ModelConfig, request: ModelChatRequest): Promise<ModelChatResponse> {
    if (!config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.options?.maxTokens || config.maxTokens,
        temperature: request.options?.temperature || config.temperature,
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async chatWithAnthropic(config: ModelConfig, request: ModelChatRequest): Promise<ModelChatResponse> {
    if (!config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        messages: request.messages,
        max_tokens: request.options?.maxTokens || config.maxTokens,
        temperature: request.options?.temperature || config.temperature,
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      id: data.id,
      model: config.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: data.content[0].text
        },
        finishReason: data.stop_reason
      }],
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined
    };
  }

  // Ollama specific
  async detectOllamaModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.ollama?.baseUrl || 'http://localhost:11434'}/api/tags`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.warn('Failed to detect Ollama models:', error);
      return [];
    }
  }

  async pullOllamaModel(model: string): Promise<void> {
    const baseUrl = this.config.ollama?.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model })
    });

    if (!response.ok) {
      throw new Error(`Failed to pull Ollama model ${model}: ${response.statusText}`);
    }
  }

  // Configuration
  loadConfig(config: ModelManagerConfig): void {
    this.config = config;
    this.models.clear();
    config.models.forEach(model => this.addModel(model));
    this.defaultModelId = config.defaultModel;
  }

  saveConfig(): ModelManagerConfig {
    return {
      ...this.config,
      defaultModel: this.defaultModelId,
      models: Array.from(this.models.values())
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const modelManager = new DefaultModelManager();