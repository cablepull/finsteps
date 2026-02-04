# ADR-0012: AI Model Management System

## Status
accepted

## Context

The Finsteps framework is a Mermaid presentation runtime focused on diagram-based presentations. As AI-powered features become increasingly valuable for content creation, code generation, and interactive experiences, there's a need to integrate AI model capabilities directly into the framework.

Users currently face these challenges:
- No built-in AI integration for generating presentation content
- No way to leverage AI for dynamic content creation within presentations
- No standardized approach to using different AI providers (OpenAI, Anthropic, local models)
- Increasing demand for local AI model support (privacy, cost, customization)

While the core presentation functionality remains focused on Mermaid diagrams, adding AI capabilities as an optional module would enhance the framework's utility without disrupting existing functionality.

## Decision

We will add an AI Model Management System as an optional, non-core module that provides:

1. **Multi-Provider Support**: Support for OpenAI, Anthropic, and Ollama (local models)
2. **Local Model Priority**: First-class support for local Ollama models, starting with qwen3-coder:30b
3. **Type-Safe Configuration**: Full TypeScript support with proper interfaces
4. **Backward Compatibility**: AI module is entirely optional and doesn't affect existing presentation functionality
5. **Model Management**: Dynamic model addition, removal, and configuration
6. **Chat Interface**: Standardized chat API for all providers

### Key Design Principles

- **Optional Module**: AI functionality is completely separate from core presentation features
- **Provider Agnostic**: Uniform API regardless of AI provider
- **Local-First**: Prioritize local model support (Ollama) for privacy and cost control
- **Developer Friendly**: Easy integration with existing TypeScript/JavaScript projects
- **Non-Intrusive**: No changes to existing presentation APIs or behavior

## Consequences

### Positive

- **Enhanced Capabilities**: Enables AI-powered content generation within Finsteps presentations
- **Local Model Support**: Users can run AI models locally for privacy and cost control
- **Flexible Provider Support**: Easy switching between OpenAI, Anthropic, and local models
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Zero Impact**: Existing code continues to work unchanged
- **Extensible**: Easy to add new AI providers in the future
- **Validated**: Includes testing tools and validation scripts

### Negative

- **Bundle Size**: Adds AI module to distribution (~3KB gzipped)
- **Dependency Management**: Requires fetch API availability (standard in modern environments)
- **Configuration Complexity**: Users need to understand AI provider setup
- **Testing Surface**: Additional module to test and maintain

### Neutral

- **Learning Curve**: Users need to understand AI model configuration
- **Network Requirements**: External AI providers need internet access
- **Local Setup**: Ollama requires local installation and configuration

## Implementation Notes

### Module Structure
```
src/ai/
├── types.ts          # TypeScript interfaces and types
├── model-manager.ts  # Core model management implementation
└── index.ts          # Module exports
```

### Key Interfaces

```typescript
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
```

### Pre-Configured Models

The system comes with sensible defaults:
- **GPT-4** (OpenAI) - `gpt-4`
- **Claude 3 Sonnet** (Anthropic) - `claude-3-sonnet-20240229`
- **Qwen3 Coder 30B** (Ollama) - `qwen3-coder:30b` *(local model)*

### Usage Pattern

```typescript
import { modelManager } from 'finsteps';

// Check available models
const models = modelManager.getAvailableModels();

// Chat with local qwen3-coder:30b model
const response = await modelManager.chat({
  model: 'qwen3-coder-30b',
  messages: [{ 
    role: 'user', 
    content: 'Generate MPD code for a flowchart presentation' 
  }]
});
```

### Testing and Validation

- **Validation Script**: `npm run test:ollama` tests Ollama integration
- **Example Usage**: Complete working example in `examples/ai-usage.ts`
- **Type Checking**: Full TypeScript type validation
- **Integration Testing**: Tests with actual Ollama instances

## Integration with Existing Architecture

- **Non-Intrusive**: AI module is completely separate from presentation core
- **Optional Import**: Users must explicitly import AI functionality
- **Shared Patterns**: Follows existing TypeScript patterns and conventions
- **Independent Testing**: AI tests are separate from presentation tests

## Documentation Strategy

- **Feature Documentation**: Complete guide in `docs/ai-models.md`
- **API Reference**: Integrated into existing API documentation
- **Examples**: Working code examples for common use cases
- **Setup Guide**: Step-by-step Ollama installation and configuration

## Related

- **Optional Extension**: Not related to core presentation functionality
- **Type Safety**: Builds on existing TypeScript patterns
- **Testing**: Adds to existing test infrastructure
- **Bundle Management**: Integrated into existing build process

## Date

2026-02-04