export type AiAudioFormat = 'webm' | 'ogg' | 'mp4' | 'm4a' | 'wav';

export interface AiTranscribeRequest {
  audioBase64: string;
  format: AiAudioFormat;
}

export interface AiTranscribeResponse {
  text: string;
}

export interface N8nTranscribeWebhookPayload {
  action: 'transcribe';
  input_audio: {
    data: string;
    format: AiAudioFormat;
  };
}
