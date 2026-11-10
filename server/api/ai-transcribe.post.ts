import { useRuntimeConfig } from 'nitropack/runtime';
import type { AiChatRuntimeConfig } from '../utils/aiChatHandler';
import { createAiTranscribeHandler } from '../utils/aiTranscribeHandler';

export default createAiTranscribeHandler({
  getConfig: (event) => useRuntimeConfig(event) as unknown as AiChatRuntimeConfig,
});
