# Changelog

## 0.4.4 (2026-02-04)

### Added
- **AI Model Management System** - Optional multi-provider AI integration
  - Support for OpenAI, Anthropic, and Ollama providers
  - Pre-configured models: GPT-4, Claude 3 Sonnet, qwen3-coder:30b
  - Local model support via Ollama with privacy-first approach
  - TypeScript interfaces and type safety
  - Model management API (add, remove, configure models)
  - Validation script: `npm run test:ollama`
  - Example usage in `examples/ai-usage.ts`
  - Complete documentation in `docs/ai-models.md`
  - Architecture Decision Record: ADR-0012

### Technical
- New module: `src/ai/` for AI functionality
- Optional import pattern - doesn't affect existing presentation functionality
- Streaming response handling for Ollama API
- Provider-agnostic chat interface
- Comprehensive TypeScript type definitions

## 0.1.0

- Initial core orchestrator runtime with controller, action engine, and binding engine.
- Basic camera/overlay adapters and mock handles.
- Integration tests and reference examples.
