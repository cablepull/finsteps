# AI Model Configuration

This module adds AI model management capabilities to Finsteps, with support for multiple providers including local Ollama models.

## Features

- **Multiple Provider Support**: OpenAI, Anthropic, and Ollama
- **Local Model Support**: Use local models via Ollama
- **Easy Model Management**: Add, remove, and configure models
- **Type-Safe**: Full TypeScript support with proper types

## Quick Start

### 1. Install and Setup Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama server
ollama serve

# Pull the qwen3-coder:30b model
ollama pull qwen3-coder:30b
```

### 2. Basic Usage

```typescript
import { modelManager, type ModelChatRequest } from 'finsteps';

// Check available models
const models = modelManager.getAvailableModels();
console.log(models);

// Chat with qwen3-coder:30b
const request: ModelChatRequest = {
  model: 'qwen3-coder-30b',
  messages: [
    {
      role: 'user',
      content: 'Write a simple React component for a button'
    }
  ]
};

const response = await modelManager.chat(request);
console.log(response.choices[0].message.content);
```

### 3. Adding Custom Models

```typescript
// Add a new Ollama model
modelManager.addModel({
  id: 'my-custom-model',
  name: 'My Custom Model',
  provider: 'ollama',
  model: 'llama3:8b',
  baseUrl: 'http://localhost:11434',
  maxTokens: 2048,
  temperature: 0.7,
  enabled: true
});
```

### 4. Using Other Providers

```typescript
// OpenAI (requires API key)
modelManager.addModel({
  id: 'gpt-4',
  name: 'GPT-4',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'your-api-key-here',
  maxTokens: 4096,
  temperature: 0.7,
  enabled: true
});

// Anthropic (requires API key)
modelManager.addModel({
  id: 'claude-3-sonnet',
  name: 'Claude 3 Sonnet',
  provider: 'anthropic',
  model: 'claude-3-sonnet-20240229',
  apiKey: 'your-api-key-here',
  maxTokens: 4096,
  temperature: 0.7,
  enabled: true
});
```

## Available Models

The system comes pre-configured with:

- **GPT-4** (OpenAI) - `gpt-4`
- **Claude 3 Sonnet** (Anthropic) - `claude-3-sonnet`
- **Qwen3 Coder 30B** (Ollama) - `qwen3-coder-30b` *(local model)*

## Testing

Run the validation script to test your setup:

```bash
npm run test:ollama
```

This will:
- Check if Ollama is running
- Detect available Ollama models
- Test the qwen3-coder:30b model
- Validate the full integration

## Example Usage

See `examples/ai-usage.ts` for a complete working example.

## Configuration

All models are configured with sensible defaults:
- Max tokens: 4096
- Temperature: 0.7
- Ollama base URL: `http://localhost:11434`

You can customize these values when adding models or in individual chat requests.

## API Reference

### ModelManager

- `getAvailableModels()`: Get all enabled models
- `getModel(id)`: Get a specific model by ID
- `addModel(model)`: Add a new model
- `removeModel(id)`: Remove a model
- `setDefaultModel(id)`: Set the default model
- `chat(request)`: Send a chat request
- `detectOllamaModels()`: Detect available Ollama models
- `pullOllamaModel(model)`: Pull a model from Ollama

### Types

- `ModelConfig`: Configuration for a model
- `ModelChatRequest`: Chat request structure
- `ModelChatResponse`: Chat response structure
- `ModelProvider`: Supported providers ("openai", "anthropic", "ollama")