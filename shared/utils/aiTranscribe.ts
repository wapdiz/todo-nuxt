import type { AiAudioFormat, AiTranscribeRequest, AiTranscribeResponse } from '../types/aiTranscribe';

export const AI_TRANSCRIBE_MAX_DURATION_MS = 45_000;
export const AI_TRANSCRIBE_MIN_AUDIO_BYTES = 64;
export const AI_TRANSCRIBE_MAX_AUDIO_BYTES = 1_048_576;
export const AI_TRANSCRIBE_MAX_REQUEST_BYTES = 1_572_864;
export const AI_TRANSCRIBE_BODY_TIMEOUT_MS = 20_000;
export const AI_TRANSCRIBE_UPSTREAM_TIMEOUT_MS = 25_000;
export const AI_TRANSCRIBE_MAX_TEXT_LENGTH = 2000;

export const AI_TRANSCRIBE_ALLOWED_FORMATS = ['webm', 'ogg', 'mp4', 'm4a', 'wav'] as const;

const VALID_FORMATS = new Set<string>(AI_TRANSCRIBE_ALLOWED_FORMATS);
const MAX_BASE64_LENGTH = Math.ceil(AI_TRANSCRIBE_MAX_AUDIO_BYTES / 3) * 4;
const STRICT_BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

const MIME_TO_FORMAT: Record<string, AiAudioFormat> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function resolveAudioFormatFromMime(mimeType: string): AiAudioFormat | null {
  if (typeof mimeType !== 'string') return null;
  const baseMime = mimeType.trim().toLowerCase().split(';', 1)[0]?.trim() ?? '';
  return MIME_TO_FORMAT[baseMime] ?? null;
}

export function parseAiTranscribeRequest(raw: unknown): AiTranscribeRequest | null {
  if (!isRecord(raw)) return null;

  const format = typeof raw.format === 'string' ? raw.format.trim().toLowerCase() : '';
  if (!VALID_FORMATS.has(format)) return null;

  if (typeof raw.audioBase64 !== 'string') return null;
  const cleaned = raw.audioBase64.trim();
  if (!cleaned || cleaned.length > MAX_BASE64_LENGTH || cleaned.length % 4 !== 0) return null;
  if (!STRICT_BASE64_REGEX.test(cleaned)) return null;

  const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
  const decodedBytes = (cleaned.length / 4) * 3 - padding;
  if (decodedBytes < AI_TRANSCRIBE_MIN_AUDIO_BYTES || decodedBytes > AI_TRANSCRIBE_MAX_AUDIO_BYTES) {
    return null;
  }

  return {
    audioBase64: cleaned,
    format: format as AiAudioFormat,
  };
}

function normalizeTranscriptText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, AI_TRANSCRIBE_MAX_TEXT_LENGTH).trim();
}

export function parseAiTranscribeResponse(raw: unknown): AiTranscribeResponse {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{')) {
      try {
        return parseAiTranscribeResponse(JSON.parse(trimmed));
      } catch {
        return { text: normalizeTranscriptText(trimmed) };
      }
    }
    return { text: normalizeTranscriptText(trimmed) };
  }

  if (!isRecord(raw)) return { text: '' };

  if (typeof raw.text === 'string') {
    return { text: normalizeTranscriptText(raw.text) };
  }
  if (isRecord(raw.output) && typeof raw.output.text === 'string') {
    return { text: normalizeTranscriptText(raw.output.text) };
  }
  if (typeof raw.output === 'string') {
    return { text: normalizeTranscriptText(raw.output) };
  }
  if (isRecord(raw.data) && typeof raw.data.text === 'string') {
    return { text: normalizeTranscriptText(raw.data.text) };
  }

  return { text: '' };
}

export function mergeTranscribedDraft(
  currentDraft: string,
  transcript: string,
  maxLength: number,
): { value: string; truncated: boolean } {
  const safeMax = Math.max(0, maxLength);
  const normalized = transcript.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    const kept = currentDraft.slice(0, safeMax);
    return { value: kept, truncated: currentDraft.length > safeMax };
  }

  if (!currentDraft.trim()) {
    const clipped = normalized.slice(0, safeMax).trimEnd();
    return { value: clipped, truncated: normalized.length > safeMax };
  }

  const base = currentDraft.slice(0, safeMax);
  const separator = /\s$/.test(base) ? '' : ' ';
  const available = safeMax - base.length - separator.length;
  if (available <= 0) {
    return { value: base, truncated: true };
  }

  const addition = normalized.slice(0, available).trimEnd();
  if (!addition) {
    return { value: base, truncated: true };
  }

  return {
    value: `${base}${separator}${addition}`,
    truncated: normalized.length > available,
  };
}
