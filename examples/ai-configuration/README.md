# AI Model Configuration Example

This example demonstrates the AI model management system for Finsteps, providing a user-friendly interface to configure and test multiple AI providers.

## Features

- **Model Management**: View and select from available AI models
- **Multi-Provider Support**: OpenAI, Anthropic, and Ollama (local) models
- **Configuration UI**: Set temperature, max tokens, and API keys
- **Chat Interface**: Test models with an interactive chat
- **Ollama Integration**: Detect and pull local models
- **Quick Templates**: Pre-defined prompts for common tasks

## Files

- `index.html` - Full-featured version using local build (requires `npm run build`)
- `demo.html` - Demo version with mock responses (works standalone)
- `README.md` - This file

## Quick Start

### Demo Version (Recommended for testing)

Open `demo.html` directly in your browser - it includes mock AI responses and works without any setup.

### Full Version (Requires build)

1. Build the project:
```bash
npm run build
```

2. Open `index.html` in your browser

3. Ensure Ollama is running for local models:
```bash
ollama serve
```

## Usage

### 1. Select a Model
- Choose from the available models in the left panel
- Models include:
  - **Qwen3 Coder 30B (Local)** - No API key required
  - **GPT-4** - Requires OpenAI API key
  - **Claude 3 Sonnet** - Requires Anthropic API key

### 2. Configure Settings
- **Temperature**: Controls randomness (0-1)
- **Max Tokens**: Response length limit
- **API Key**: Required for OpenAI/Anthropic models

### 3. Test Connection
- Click "Test" to verify the model is accessible
- Shows success/error status

### 4. Chat with AI
- Type messages in the chat interface
- Use templates for common tasks:
  - 📝 Generate MPD Code
  - 📚 Explain Concept
  - 🔍 Code Review
  - 💡 Creative Ideas

### 5. Ollama Management
- **Detect Models**: Scan for available Ollama models
- **Pull Model**: Download new models from Ollama

## Local AI Model Setup (Ollama)

### Install Ollama
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Start Ollama Server
```bash
ollama serve
```

### Pull Models
```bash
ollama pull qwen3-coder:30b
ollama pull llama3.1:8b
ollama pull wizardcoder:latest
```

### Verify Installation
```bash
ollama list
```

## API Integration

The example shows how to use the AI module:

```javascript
import { modelManager } from 'finsteps';

// Get available models
const models = modelManager.getAvailableModels();

// Select and chat with a model
const response = await modelManager.chat({
  model: 'qwen3-coder-30b',
  messages: [
    { role: 'user', content: 'Generate MPD code for a flowchart' }
  ],
  options: {
    temperature: 0.7,
    maxTokens: 2048
  }
});

console.log(response.choices[0].message.content);
```

## Features Demonstrated

### Model Management
- Dynamic model discovery
- Provider-specific configuration
- API key management
- Status indicators

### User Interface
- Responsive design
- Real-time status updates
- Loading states
- Error handling

### Integration
- Multiple AI providers
- Unified chat interface
- Configuration persistence
- Template system

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: CSS Grid, Flexbox, CSS Variables
- **AI Integration**: Finsteps AI module
- **Local Storage**: Configuration persistence (optional)

### Browser Compatibility
- Modern browsers with ES6 module support
- Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+

### Security
- API keys stored in memory only
- No data persisted to localStorage by default
- HTTPS recommended for API keys

## Troubleshooting

### Ollama Connection Issues
1. Ensure Ollama is running: `ollama serve`
2. Check if port 11434 is accessible
3. Verify model installation: `ollama list`

### API Key Issues
1. Double-check key format
2. Ensure valid subscription
3. Check network connectivity

### Build Issues
1. Run `npm run build` to generate dist files
2. Check TypeScript compilation: `npm run typecheck`
3. Verify import paths

## Next Steps

- Add more AI providers (Google Gemini, Cohere)
- Implement conversation history persistence
- Add streaming response support
- Create presentation generation templates
- Integrate with MPD editor