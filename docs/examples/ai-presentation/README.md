# AI-Powered Presentation Example

This example demonstrates how to integrate AI generation capabilities directly into Finsteps presentations, allowing users to create and enhance presentations using natural language prompts.

## Features

- **AI Generation**: Generate complete MPD presentations from natural language descriptions
- **Content Enhancement**: Improve existing presentations with AI suggestions
- **Multiple Models**: Choose from different AI providers (OpenAI, Anthropic, Ollama)
- **Template Prompts**: Pre-built prompts for common presentation types
- **Live Preview**: Real-time presentation updates
- **Interactive Editing**: Modify both Mermaid and MPD code

## Quick Start

1. Open `index.html` in your browser
2. The demo uses mock AI responses, so no setup is required
3. Try the pre-built template prompts or enter your own

## Usage

### 1. Generate a New Presentation

1. Select an AI model from the dropdown
2. Enter a natural language description, for example:
   - "Create a flowchart about software development lifecycle"
   - "Generate a presentation about cloud computing architecture"
   - "Make a timeline presentation about web development history"
3. Click "🚀 Generate" to create the presentation
4. The AI will generate both Mermaid diagram code and MPD presentation steps

### 2. Use Template Prompts

Quick start with one of the pre-built templates:
- **☁️ Cloud Computing**: Infrastructure, deployment, and scaling
- **🧠 Machine Learning**: Data preparation, training, evaluation
- **🌐 Web History**: From HTML to modern frameworks
- **🏃 Agile Process**: Sprint planning and review cycles

### 3. Enhance Existing Content

1. Create or load a presentation
2. Click "✨ Enhance" to improve it with AI
3. The AI will add more detailed steps and better overlays

### 4. Customize and Iterate

1. Edit the generated Mermaid diagram code
2. Modify the MPD presentation steps
3. Click "Apply MPD Code" or "Update Diagram" to see changes
4. Use navigation controls to step through the presentation

## Example Prompts

### Software Development
```
Generate MPD code for a flowchart about software development lifecycle with planning, development, testing, and deployment steps.
```

### Business Process
```
Create a presentation about customer journey mapping from awareness to purchase and retention.
```

### Technical Architecture
```
Make a technical diagram showing microservices architecture with API gateway, services, and database layers.
```

### Educational Content
```
Generate a timeline presentation about the evolution of programming languages from the 1950s to present day.
```

## AI Model Selection

### Available Models (Demo)
- **Qwen3 Coder 30B (Local)** - Best for code and technical content
- **GPT-4** - General purpose, good for explanations
- **Claude 3 Sonnet** - Detailed, thoughtful responses

### Model Characteristics
- **Local Models**: No API keys required, better privacy
- **Cloud Models**: More capable, require API keys
- **Specialized Models**: Better for specific domains (coding, writing, etc.)

## Integration Patterns

### Basic AI Integration
```javascript
async function generatePresentation(prompt) {
    const response = await modelManager.chat({
        model: 'qwen3-coder-30b',
        messages: [{ 
            role: 'user', 
            content: `Generate MPD code for: ${prompt}` 
        }]
    });
    
    return response.choices[0].message.content;
}
```

### Enhancement Pattern
```javascript
async function enhancePresentation(currentMpd) {
    const response = await modelManager.chat({
        model: 'gpt-4',
        messages: [
            { role: 'user', content: `Enhance this MPD: ${currentMpd}` }
        ]
    });
    
    return response.choices[0].message.content;
}
```

### Template System
```javascript
const templates = {
    'flowchart': 'Create a flowchart presentation about {topic} with {steps} main phases.',
    'timeline': 'Generate a timeline showing the evolution of {topic} from {start} to {end}.',
    'architecture': 'Design a technical architecture diagram for {system} with {components}.'
};

function applyTemplate(template, variables) {
    return templates[template].replace(/{(\w+)}/g, (match, key) => variables[key]);
}
```

## Best Practices

### Prompt Engineering
1. **Be Specific**: Include the number of steps and key concepts
2. **Specify Format**: Request "MPD code" for consistent output
3. **Define Structure**: Mention overview, details, and conclusion steps
4. **Include Context**: Provide background information when relevant

### Integration Tips
1. **Validate Output**: Check generated MPD syntax before applying
2. **Iterative Enhancement**: Use multiple small prompts instead of one large request
3. **Fallback Handling**: Provide default content if AI generation fails
4. **User Feedback**: Allow users to edit and refine AI-generated content

### Error Handling
```javascript
try {
    const mpdCode = await generatePresentation(prompt);
    const result = parseMPD(mpdCode);
    if (result.diagnostics.length > 0) {
        console.error('Invalid MPD generated:', result.diagnostics);
        showErrorMessage('AI generated invalid MPD code');
        return;
    }
    applyPresentation(mpdCode);
} catch (error) {
    console.error('Generation failed:', error);
    showErrorMessage('Failed to generate presentation');
}
```

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with ES6 modules
- **AI Integration**: Mock responses for demo (replace with real modelManager)
- **Presentation**: Finsteps runtime with Mermaid rendering
- **State Management**: Simple component-based state

### File Structure
```
ai-presentation/
├── index.html          # Main application
├── README.md           # This file
└── integration-guide.md  # Advanced integration patterns
```

### Dependencies
- Mermaid.js for diagram rendering
- Finsteps for presentation runtime
- Web Fetch API for AI requests
- Modern ES6+ JavaScript

## Advanced Features

### Multi-Model Comparison
Generate the same presentation with different AI models to compare results:

```javascript
const models = ['gpt-4', 'claude-3-sonnet', 'qwen3-coder-30b'];
const results = await Promise.all(
    models.map(model => generateWithModel(prompt, model))
);

// Present options to user to choose the best result
```

### Iterative Refinement
Use a conversation approach to refine presentations:

```javascript
async function iterativeGeneration(initialPrompt, refinements = []) {
    let currentMpd = await generatePresentation(initialPrompt);
    
    for (const refinement of refinements) {
        currentMpd = await refinePresentation(currentMpd, refinement);
    }
    
    return currentMpd;
}
```

### Context-Aware Generation
Include diagram context for better AI responses:

```javascript
async function contextualGeneration(mermaidText, mpdText) {
    const context = `
    Current Mermaid diagram:
    ${mermaidText}
    
    Current MPD steps:
    ${mpdText}
    `;
    
    return modelManager.chat({
        model: 'gpt-4',
        messages: [
            { role: 'user', content: `${context}\n\nImprove this presentation.` }
        ]
    });
}
```

## Real Implementation

For production use with real AI models:

1. Replace the mock AI system with the actual modelManager:
```javascript
import { modelManager } from 'finsteps';

// Instead of mockAI.generateContent()
const response = await modelManager.chat({
    model: currentModel,
    messages: [{ role: 'user', content: prompt }]
});
```

2. Configure API keys for cloud providers
3. Set up Ollama for local models
4. Add proper error handling and validation
5. Implement authentication and rate limiting

## Troubleshooting

### Common Issues
1. **Generated MPD is invalid**: Use validation and provide feedback
2. **AI responses are too generic**: Use more specific prompts
3. **Performance is slow**: Implement caching and streaming
4. **API limits exceeded**: Add rate limiting and fallback models

### Debug Mode
Enable console logging to see AI requests and responses:
```javascript
const debugMode = true;

if (debugMode) {
    console.log('AI Prompt:', prompt);
    console.log('AI Response:', response);
}
```

## Next Steps

- Add more specialized templates for different domains
- Implement conversation history for context-aware generation
- Create collaborative features for multiple users
- Add export options (PDF, PowerPoint, etc.)
- Integrate with presentation platforms (Google Slides, PowerPoint)