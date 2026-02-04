#!/usr/bin/env node

import { modelManager, type ModelChatRequest } from '../src/ai/index.js';

async function testOllamaIntegration(): Promise<void> {
  console.log('🔍 Testing Ollama Integration...\n');

  try {
    // Test 1: Check available models
    console.log('1. Checking available models...');
    const availableModels = modelManager.getAvailableModels();
    console.log('Available models:', availableModels.map(m => `${m.name} (${m.id})`).join(', '));

    // Test 2: Check Ollama specifically
    console.log('\n2. Checking Ollama models...');
    const ollamaModels = await modelManager.detectOllamaModels();
    console.log('Detected Ollama models:', ollamaModels.length > 0 ? ollamaModels.join(', ') : 'None detected');

    if (ollamaModels.length === 0) {
      console.log('\n⚠️  No Ollama models detected. Make sure Ollama is running:');
      console.log('   - Install Ollama: https://ollama.ai/');
      console.log('   - Start Ollama: ollama serve');
      console.log('   - Pull model: ollama pull qwen3-coder:30b');
      return;
    }

    // Test 3: Try to use qwen3-coder:30b model
    console.log('\n3. Testing qwen3-coder:30b model...');
    const qwenModel = modelManager.getModel('qwen3-coder-30b');
    
    if (!qwenModel) {
      console.log('❌ qwen3-coder-30b model not found in configuration');
      return;
    }

    if (!ollamaModels.includes('qwen3-coder:30b')) {
      console.log('❌ qwen3-coder:30b not found in Ollama. Pulling it now...');
      await modelManager.pullOllamaModel('qwen3-coder:30b');
      console.log('✅ qwen3-coder:30b pulled successfully');
    }

    // Test 4: Send a test chat request
    console.log('\n4. Sending test chat request...');
    const chatRequest: ModelChatRequest = {
      model: 'qwen3-coder-30b',
      messages: [
        {
          role: 'user',
          content: 'Write a simple "Hello World" function in Python. Keep it brief.'
        }
      ],
      options: {
        maxTokens: 100,
        temperature: 0.7
      }
    };

    const response = await modelManager.chat(chatRequest);
    console.log('✅ Chat response received:');
    console.log('Model:', response.model);
    console.log('Response:', response.choices[0].message.content);
    
    if (response.usage) {
      console.log('Tokens used:', response.usage.totalTokens);
    }

    console.log('\n🎉 All tests passed! Ollama integration is working correctly.');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        console.log('\n🔧 Connection issue suggestions:');
        console.log('   - Check if Ollama is running: ollama serve');
        console.log('   - Verify Ollama is accessible at http://localhost:11434');
        console.log('   - Check firewall settings');
      } else if (error.message.includes('API key')) {
        console.log('\n🔑 API key configuration needed for other providers');
      }
    }
  }
}

// Check if Ollama is accessible
async function checkOllamaConnection(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch {
    return false;
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🤖 Finsteps AI Model Configuration Validator\n');
  
  const isOllamaConnected = await checkOllamaConnection();
  if (!isOllamaConnected) {
    console.log('❌ Ollama is not running or not accessible at http://localhost:11434');
    console.log('\n📋 Setup instructions:');
    console.log('1. Install Ollama: curl -fsSL https://ollama.ai/install.sh | sh');
    console.log('2. Start Ollama: ollama serve');
    console.log('3. Pull the model: ollama pull qwen3-coder:30b');
    console.log('4. Run this script again');
    return;
  }

  await testOllamaIntegration();
}

main().catch(console.error);