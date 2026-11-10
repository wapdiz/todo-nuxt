import type { AiTranscribeRequest, AiTranscribeResponse } from '../../shared/types/aiTranscribe';
import {
  AI_TRANSCRIBE_MAX_AUDIO_BYTES,
  AI_TRANSCRIBE_MAX_DURATION_MS,
  AI_TRANSCRIBE_MIN_AUDIO_BYTES,
  resolveAudioFormatFromMime,
} from '../../shared/utils/aiTranscribe';

export type VoiceRecorderStatus = 'idle' | 'starting' | 'recording' | 'transcribing';

export interface VoiceRecorderState {
  status: VoiceRecorderStatus;
  elapsedMs: number;
  error: string;
}

export interface VoiceMediaTrack {
  stop(): void;
  onended?: (() => void) | null;
}

export interface VoiceMediaStream {
  getTracks(): VoiceMediaTrack[];
}

export interface VoiceRecorderAdapter {
  readonly mimeType: string;
  onDataAvailable: ((chunk: Blob) => void) | null;
  onStop: (() => void) | null;
  onError: ((err: unknown) => void) | null;
  start(): void;
  stop(): void;
}

export interface VoiceRecorderHost {
  isSupported(): boolean;
  isMimeTypeSupported(mimeType: string): boolean;
  requestMicrophone(): Promise<VoiceMediaStream>;
  createRecorder(stream: VoiceMediaStream, mimeType?: string): VoiceRecorderAdapter;
  createBlob(chunks: Blob[], mimeType?: string): Blob;
  blobToBase64(blob: Blob): Promise<string>;
  now(): number;
  setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout>;
  clearTimeout(id: ReturnType<typeof setTimeout>): void;
  setInterval(fn: () => void, ms: number): ReturnType<typeof setInterval>;
  clearInterval(id: ReturnType<typeof setInterval>): void;
}

export interface VoiceRecorderDeps {
  host?: VoiceRecorderHost;
  createState?: (initial: VoiceRecorderState) => VoiceRecorderState;
  transcribeAudio?: (payload: AiTranscribeRequest, signal: AbortSignal) => Promise<AiTranscribeResponse>;
  onTranscript: (text: string) => void;
  onEmptyTranscript?: () => void;
  onError?: (message: string) => void;
  onStatusChange?: (status: VoiceRecorderStatus) => void;
  maxDurationMs?: number;
  minAudioBytes?: number;
  maxAudioBytes?: number;
}

export const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4',
] as const;

export function pickRecorderMimeCandidate(isTypeSupported: (mime: string) => boolean): string | undefined {
  for (const mime of RECORDER_MIME_CANDIDATES) {
    try {
      if (isTypeSupported(mime)) return mime;
    } catch {
      // Браузер может бросать исключение на незнакомых строках codecs
    }
  }
  return undefined;
}

export function formatVoiceDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export function extractVoiceErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const name = 'name' in err && typeof err.name === 'string' ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Микрофон не найден. Подключите микрофон и попробуйте снова.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'Микрофон занят другим приложением или недоступен.';
    }
    if (name === 'SecurityError') {
      return 'Запись голоса доступна по HTTPS или на localhost.';
    }

    const statusCode =
      ('statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : undefined) ??
      ('status' in err && typeof err.status === 'number' ? err.status : undefined);
    const data = 'data' in err && typeof err.data === 'object' && err.data !== null ? err.data : undefined;
    const serverMessage =
      data && 'message' in data && typeof data.message === 'string' && data.message.trim()
        ? data.message.trim()
        : undefined;

    if (statusCode === 413) {
      return serverMessage || 'Аудиозапись слишком большая. Попробуйте записать более короткий фрагмент.';
    }
    if (statusCode === 429) {
      return serverMessage || 'Слишком много запросов. Подождите немного и попробуйте снова.';
    }
    if (statusCode === 503) {
      return serverMessage || 'Распознавание речи не настроено на сервере.';
    }
    if (statusCode === 408 || statusCode === 504) {
      return serverMessage || 'Распознавание речи заняло слишком много времени. Попробуйте записать короче.';
    }
    if (statusCode === 502) {
      return serverMessage || 'Сервис распознавания речи временно недоступен.';
    }
    if (serverMessage) return serverMessage;
    if ('message' in err && typeof err.message === 'string' && err.message.trim() && statusCode) {
      return err.message.trim();
    }
  }

  return 'Не удалось распознать речь. Проверьте подключение и повторите попытку.';
}

function stopMediaStream(stream: VoiceMediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.onended = null;
    try {
      track.stop();
    } catch {
      // Игнорируем уже остановленные дорожки
    }
  }
}

async function defaultTranscribeAudio(
  payload: AiTranscribeRequest,
  signal: AbortSignal,
): Promise<AiTranscribeResponse> {
  const response = await fetch('/api/ai-transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    throw Object.assign(new Error('Speech transcription request failed'), {
      statusCode: response.status,
      data,
    });
  }

  return { text: typeof data?.text === 'string' ? data.text : '' };
}

function wrapNativeStream(nativeStream: MediaStream): VoiceMediaStream {
  return {
    getTracks: () =>
      nativeStream.getTracks().map((track) => ({
        stop: () => track.stop(),
        get onended() {
          return track.onended ? () => track.onended?.call(track, new Event('ended')) : null;
        },
        set onended(handler: (() => void) | null | undefined) {
          track.onended = handler ? () => handler() : null;
        },
      })),
  };
}

export function createBrowserVoiceHost(): VoiceRecorderHost {
  return {
    isSupported() {
      return (
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined'
      );
    },
    isMimeTypeSupported(mimeType: string) {
      return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
        ? MediaRecorder.isTypeSupported(mimeType)
        : false;
    },
    async requestMicrophone() {
      let nativeStream: MediaStream;
      try {
        nativeStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'OverconstrainedError') {
          nativeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw err;
        }
      }
      return Object.assign(wrapNativeStream(nativeStream), { _nativeStream: nativeStream });
    },
    createRecorder(stream: VoiceMediaStream, mimeType?: string): VoiceRecorderAdapter {
      const withNative = stream as VoiceMediaStream & { _nativeStream?: MediaStream };
      const nativeStream = withNative._nativeStream ?? (stream as unknown as MediaStream);
      let native: MediaRecorder;
      try {
        native = new MediaRecorder(nativeStream, {
          ...(mimeType ? { mimeType } : {}),
          audioBitsPerSecond: 32_000,
        });
      } catch {
        try {
          native = mimeType ? new MediaRecorder(nativeStream, { mimeType }) : new MediaRecorder(nativeStream);
        } catch {
          native = new MediaRecorder(nativeStream);
        }
      }

      const adapter: VoiceRecorderAdapter = {
        get mimeType() {
          return native.mimeType;
        },
        onDataAvailable: null,
        onStop: null,
        onError: null,
        start() {
          native.start();
        },
        stop() {
          if (native.state !== 'inactive') native.stop();
        },
      };

      native.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          adapter.onDataAvailable?.(event.data);
        }
      };
      native.onstop = () => {
        adapter.onStop?.();
      };
      native.onerror = (event: Event) => {
        const recErr = 'error' in event ? (event as Event & { error?: unknown }).error : event;
        adapter.onError?.(recErr ?? new Error('Recorder error'));
      };

      return adapter;
    },
    createBlob(chunks: Blob[], mimeType?: string) {
      return mimeType ? new Blob(chunks, { type: mimeType }) : new Blob(chunks);
    },
    blobToBase64(blob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = typeof reader.result === 'string' ? reader.result : '';
          const commaIndex = result.indexOf(',');
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать аудиозапись.'));
        reader.readAsDataURL(blob);
      });
    },
    now: () => Date.now(),
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (id) => globalThis.clearTimeout(id),
    setInterval: (fn, ms) => globalThis.setInterval(fn, ms),
    clearInterval: (id) => globalThis.clearInterval(id),
  };
}

export function createVoiceRecorderController(deps: VoiceRecorderDeps) {
  const maxDurationMs = deps.maxDurationMs ?? AI_TRANSCRIBE_MAX_DURATION_MS;
  const minAudioBytes = deps.minAudioBytes ?? AI_TRANSCRIBE_MIN_AUDIO_BYTES;
  const maxAudioBytes = deps.maxAudioBytes ?? AI_TRANSCRIBE_MAX_AUDIO_BYTES;
  const transcribeAudio = deps.transcribeAudio ?? defaultTranscribeAudio;
  let host: VoiceRecorderHost | null = deps.host ?? null;

  const initialState: VoiceRecorderState = {
    status: 'idle',
    elapsedMs: 0,
    error: '',
  };
  const state = deps.createState ? deps.createState(initialState) : initialState;

  let activeOpId = 0;
  let disposed = false;
  let isStoppingRecorder = false;
  let currentStream: VoiceMediaStream | null = null;
  let currentRecorder: VoiceRecorderAdapter | null = null;
  let uploadController: AbortController | null = null;
  let durationTimer: ReturnType<typeof setTimeout> | null = null;
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  function resolveHost(): VoiceRecorderHost {
    if (!host) host = createBrowserVoiceHost();
    return host;
  }

  function setStatus(next: VoiceRecorderStatus) {
    if (state.status === next) return;
    state.status = next;
    deps.onStatusChange?.(next);
  }

  function clearTimers(currentHost: VoiceRecorderHost) {
    if (durationTimer !== null) {
      currentHost.clearTimeout(durationTimer);
      durationTimer = null;
    }
    if (elapsedTimer !== null) {
      currentHost.clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
  }

  function setError(message: string) {
    state.error = message;
    deps.onError?.(message);
  }

  function detachActiveResources() {
    if (host) clearTimers(host);
    if (currentRecorder) {
      currentRecorder.onDataAvailable = null;
      currentRecorder.onStop = null;
      currentRecorder.onError = null;
      try {
        currentRecorder.stop();
      } catch {
        // Игнорируем ошибку остановки при очистке
      }
      currentRecorder = null;
    }
    if (currentStream) {
      stopMediaStream(currentStream);
      currentStream = null;
    }
    if (uploadController) {
      uploadController.abort();
      uploadController = null;
    }
    isStoppingRecorder = false;
  }

  async function start(): Promise<void> {
    if (disposed || state.status !== 'idle') return;

    const currentHost = resolveHost();
    state.error = '';
    state.elapsedMs = 0;

    if (!currentHost.isSupported()) {
      setError('Запись голоса доступна в современных браузерах по HTTPS или на localhost.');
      return;
    }

    const opId = ++activeOpId;
    setStatus('starting');

    let stream: VoiceMediaStream;
    try {
      stream = await currentHost.requestMicrophone();
    } catch (err: unknown) {
      if (opId !== activeOpId || disposed) return;
      setStatus('idle');
      setError(extractVoiceErrorMessage(err));
      return;
    }

    if (opId !== activeOpId || disposed || (state.status as VoiceRecorderStatus) !== 'starting') {
      stopMediaStream(stream);
      return;
    }

    const candidateMime = pickRecorderMimeCandidate((mime) => currentHost.isMimeTypeSupported(mime));
    let recorder: VoiceRecorderAdapter;
    try {
      recorder = currentHost.createRecorder(stream, candidateMime);
    } catch {
      stopMediaStream(stream);
      setStatus('idle');
      setError('Не удалось запустить запись с микрофона в этом браузере.');
      return;
    }

    currentStream = stream;
    currentRecorder = recorder;
    isStoppingRecorder = false;
    const chunks: Blob[] = [];
    const startedAt = currentHost.now();

    recorder.onDataAvailable = (chunk) => {
      if (chunk && chunk.size > 0) chunks.push(chunk);
    };

    recorder.onError = (err) => {
      if (opId !== activeOpId || disposed) return;
      clearTimers(currentHost);
      stopMediaStream(currentStream);
      currentStream = null;
      currentRecorder = null;
      isStoppingRecorder = false;
      setStatus('idle');
      setError(extractVoiceErrorMessage(err));
    };

    recorder.onStop = () => {
      clearTimers(currentHost);
      stopMediaStream(currentStream);
      currentStream = null;
      currentRecorder = null;
      isStoppingRecorder = false;

      if (opId !== activeOpId || disposed) return;

      const resolvedMime = recorder.mimeType || chunks.find((item) => item.type)?.type || candidateMime || '';
      const format = resolveAudioFormatFromMime(resolvedMime);
      const blob = currentHost.createBlob(chunks, resolvedMime || undefined);

      if (!format) {
        setStatus('idle');
        setError('Формат аудиозаписи этого браузера не поддерживается.');
        return;
      }

      if (blob.size < minAudioBytes) {
        setStatus('idle');
        setError('Запись получилась слишком короткой. Попробуйте ещё раз.');
        return;
      }

      if (blob.size > maxAudioBytes) {
        setStatus('idle');
        setError('Аудиозапись слишком большая. Попробуйте записать более короткий фрагмент.');
        return;
      }

      void uploadAndTranscribe(opId, currentHost, blob, format);
    };

    for (const track of stream.getTracks()) {
      track.onended = () => {
        if (opId === activeOpId && state.status === 'recording') {
          stop();
        }
      };
    }

    try {
      recorder.start();
    } catch (err: unknown) {
      detachActiveResources();
      if (opId !== activeOpId || disposed) return;
      setStatus('idle');
      setError(extractVoiceErrorMessage(err));
      return;
    }

    setStatus('recording');
    elapsedTimer = currentHost.setInterval(() => {
      if (opId !== activeOpId || disposed || state.status !== 'recording') return;
      state.elapsedMs = Math.min(maxDurationMs, Math.max(0, currentHost.now() - startedAt));
    }, 250);
    durationTimer = currentHost.setTimeout(() => {
      if (opId === activeOpId && state.status === 'recording') {
        state.elapsedMs = maxDurationMs;
        stop();
      }
    }, maxDurationMs);
  }

  async function uploadAndTranscribe(
    opId: number,
    currentHost: VoiceRecorderHost,
    blob: Blob,
    format: NonNullable<ReturnType<typeof resolveAudioFormatFromMime>>,
  ) {
    setStatus('transcribing');
    const controller = new AbortController();
    uploadController = controller;

    try {
      const audioBase64 = await currentHost.blobToBase64(blob);
      if (opId !== activeOpId || disposed) return;

      const response = await transcribeAudio({ audioBase64, format }, controller.signal);
      if (opId !== activeOpId || disposed) return;

      setStatus('idle');
      state.elapsedMs = 0;

      const transcript = response.text.trim();
      if (!transcript) {
        deps.onEmptyTranscript?.();
        return;
      }

      deps.onTranscript(transcript);
    } catch (err: unknown) {
      if (opId !== activeOpId || disposed) return;
      setStatus('idle');
      state.elapsedMs = 0;
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(extractVoiceErrorMessage(err));
    } finally {
      if (uploadController === controller) {
        uploadController = null;
      }
    }
  }

  function stop() {
    if (disposed) return;
    if (state.status === 'starting') {
      cancel();
      return;
    }
    if (state.status !== 'recording' || !currentRecorder || isStoppingRecorder) return;

    isStoppingRecorder = true;
    if (host) clearTimers(host);
    try {
      currentRecorder.stop();
    } catch (err: unknown) {
      detachActiveResources();
      setStatus('idle');
      setError(extractVoiceErrorMessage(err));
    }
  }

  function toggle() {
    if (state.status === 'idle') {
      void start();
    } else if (state.status === 'recording' || state.status === 'starting') {
      stop();
    }
  }

  function cancel() {
    activeOpId += 1;
    detachActiveResources();
    state.elapsedMs = 0;
    setStatus('idle');
  }

  function clearError() {
    state.error = '';
  }

  function dispose() {
    disposed = true;
    cancel();
  }

  return {
    state,
    start,
    stop,
    toggle,
    cancel,
    clearError,
    dispose,
  };
}
