import { useRuntimeConfig } from 'nitropack/runtime';
import { createAiChatHandler, type AiChatRuntimeConfig } from '../utils/aiChatHandler';

export default createAiChatHandler({
  getConfig: (event) => useRuntimeConfig(event) as unknown as AiChatRuntimeConfig,
});
