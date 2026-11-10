export interface PlayerOptions {
  src?: string;
  poster?: string;
  autoplay?: boolean | 'muted' | 'play' | 'any';
  preload?: 'auto' | 'metadata' | 'none';
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsinline?: boolean;
  responsive?: boolean;
  height?: number | string;
  width?: number | string;
  sources?: Array<{
    src: string;
    type: string;
  }>;
}

export interface PlayerAnalytics {
  onFirstPlay?: (video: HTMLVideoElement) => void;
  onPause?: (video: HTMLVideoElement, currentTime: number) => void;
  onEnded?: (video: HTMLVideoElement) => void;
  onPlay?: (video: HTMLVideoElement) => void;
  onTimeUpdate?: (video: HTMLVideoElement, currentTime: number) => void;
}

export interface HLSConfig {
  overrideNative?: boolean;
  enableLowInitialPlaylist?: boolean;
  maxPlaylistRetries?: number;
  [key: string]: any;
}

export interface UsePlayerOptions extends PlayerOptions {
  analytics?: PlayerAnalytics;
  playerId?: string;
  hls?: HLSConfig;
}

export type HlsInstance = any;
