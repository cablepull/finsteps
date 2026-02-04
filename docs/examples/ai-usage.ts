import { modelManager, type ModelChatRequest } from '../src/ai/index.js';

// Example: Using the qwen3-coder:30b model via Ollama
async function exampleUsage() {
  console.log('🚀 Example: Using Qwen3-Coder 30B model via Ollama\n');

  // 1. Check available models
  console.log('Available models:');
  const models = modelManager.getAvailableModels();
  models.forEach(model => {
    console.log(`- ${model.name} (${model.provider}): ${model.model}`);
  });

  // 2. Use the qwen3-coder model
  console.log('\n📝 Sending coding request to qwen3-coder:30b...');
  
  const request: ModelChatRequest = {
    model: 'qwen3-coder-30b',
    messages: [
      {
        role: 'user',
        content: `Write a TypeScript function that validates an email address using regex. 
Include proper type annotations and error handling. Keep it concise but complete.`
      }
    ],
    options: {
      maxTokens: 300,
      temperature: 0.3
    }
  };

  try {
    const response = await modelManager.chat(request);
    
    console.log('✅ Response received:');
    console.log(response.choices[0].message.content);
    
    if (response.usage) {
      console.log(`\n📊 Token usage: ${response.usage.totalTokens} total tokens`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\nMake sure Ollama is running and qwen3-coder:30b model is installed:');
    console.log('1. ollama serve');
    console.log('2. ollama pull qwen3-coder:30b');
  }
}

// Example: Managing models
function exampleModelManagement() {
  console.log('\n🔧 Example: Model Management\n');

  // Add a custom model
  modelManager.addModel({
    id: 'custom-llama',
    name: 'Custom Llama Model',
    provider: 'ollama',
    model: 'llama3:8b',
    baseUrl: 'http://localhost:11434',
    maxTokens: 2048,
    temperature: 0.5,
    enabled: true
  });

  console.log('Added custom model. Current models:');
  const updatedModels = modelManager.getAvailableModels();
  updatedModels.forEach(model => {
    console.log(`- ${model.name}: ${model.model} (${model.provider})`);
  });

  // Set default model
  modelManager.setDefaultModel('qwen3-coder-30b');
  console.log('\n✅ Default model set to qwen3-coder-30b');
}

// Run examples
async function main() {
  await exampleUsage();
  exampleModelManagement();
}

main().catch(console.error);