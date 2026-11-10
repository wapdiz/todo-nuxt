import { ref, onBeforeUnmount, type Ref } from 'vue';
import type { UsePlayerOptions, PlayerAnalytics, HlsInstance } from '@/components/UI/VPlayer/Player.type';

let hlsLib: any = null;

async function loadHLS() {
  if (hlsLib) return hlsLib;

  if (import.meta.client) {
    try {
      const hlsModule = await import('hls.js');
      hlsLib = hlsModule;
      return hlsLib;
    } catch (error) {
      console.error('HLS.js loading error:', error);
      return null;
    }
  }

  return null;
}

function isHLS(source: string | undefined): boolean {
  if (!source) return false;
  return (
    source.includes('.m3u8') ||
    source.includes('application/x-mpegURL') ||
    source.includes('application/vnd.apple.mpegurl')
  );
}

function detectHLSSources(options: UsePlayerOptions): boolean {
  if (options.src && typeof options.src === 'string') {
    return isHLS(options.src);
  }
  if (options.sources && options.sources.length > 0) {
    return options.sources.some(
      (source) =>
        isHLS(source.src) ||
        source.type === 'application/x-mpegURL' ||
        source.type === 'application/vnd.apple.mpegurl' ||
        source.type === 'application/x-mpegurl',
    );
  }
  return false;
}

function canPlayNativeHLS(video: HTMLVideoElement): boolean {
  return video.canPlayType('application/vnd.apple.mpegurl') !== '' || video.canPlayType('application/x-mpegURL') !== '';
}

export function usePlayer(options: UsePlayerOptions = {}) {
  const playerRef: Ref<HTMLVideoElement | null> = ref(null);
  const isLoading = ref(false);
  const isReady = ref(false);
  const hasPlayed = ref(false);

  let hlsInstance: HlsInstance | null = null;

  const setupAnalytics = (video: HTMLVideoElement, analytics?: PlayerAnalytics) => {
    if (!analytics) return;

    const handlePlay = () => {
      if (!hasPlayed.value) {
        hasPlayed.value = true;
        analytics.onFirstPlay?.(video);
      }
      analytics.onPlay?.(video);
    };

    const handlePause = () => {
      if (!isNaN(video.currentTime)) {
        analytics.onPause?.(video, video.currentTime);
      }
    };

    const handleEnded = () => analytics.onEnded?.(video);

    const handleTimeUpdate = () => {
      if (!isNaN(video.currentTime)) {
        analytics.onTimeUpdate?.(video, video.currentTime);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  };

  const initPlayer = async (
    element: HTMLVideoElement,
    additionalOptions?: { src?: string; sources?: Array<{ src: string; type: string }> },
  ) => {
    if (isLoading.value) return;

    try {
      isLoading.value = true;
      playerRef.value = element;

      const mergedOptions = { ...options, ...(additionalOptions || {}) };

      if (mergedOptions.poster) element.poster = mergedOptions.poster;
      if (mergedOptions.preload) element.preload = mergedOptions.preload;
      if (mergedOptions.muted !== undefined) element.muted = mergedOptions.muted;
      if (mergedOptions.loop !== undefined) element.loop = mergedOptions.loop;
      if (mergedOptions.controls !== undefined) element.controls = mergedOptions.controls;
      if (mergedOptions.playsinline !== undefined) element.playsInline = mergedOptions.playsinline;

      if (mergedOptions.autoplay) {
        const autoplay = mergedOptions.autoplay;
        if (autoplay === true || autoplay === 'play' || autoplay === 'any') {
          element.autoplay = true;
        } else if (autoplay === 'muted') {
          element.autoplay = true;
          element.muted = true;
        }
      }

      const videoSrc = mergedOptions.src || (mergedOptions.sources?.length ? mergedOptions.sources[0]?.src : null);

      if (!videoSrc) {
        isLoading.value = false;
        return;
      }

      const hasHLSSource = detectHLSSources(mergedOptions);
      const useNativeHLS = canPlayNativeHLS(element);
      const hlsConfig = mergedOptions.hls || {};
      const shouldUseHLSJS = hasHLSSource && (!useNativeHLS || hlsConfig.overrideNative === true);

      // Если это HLS и нужно использовать HLS.js
      if (shouldUseHLSJS) {
        const HLSModule = await loadHLS();
        if (!HLSModule || !HLSModule.default) {
          console.error('HLS.js не загружен');
          isLoading.value = false;
          return;
        }

        const HLS = HLSModule.default;

        if (HLS.isSupported()) {
          // Уничтожаем предыдущий экземпляр, если есть
          if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
          }

          const hlsOptions: any = {
            enableLowInitialPlaylist: hlsConfig.enableLowInitialPlaylist ?? true,
            maxPlaylistRetries: hlsConfig.maxPlaylistRetries ?? 3,
            ...hlsConfig,
          };

          hlsInstance = new HLS(hlsOptions);
          hlsInstance.loadSource(videoSrc);

          // Если есть несколько источников, используем первый HLS
          if (mergedOptions.sources && mergedOptions.sources.length > 0) {
            const hlsSource = mergedOptions.sources.find((s) => isHLS(s.src));
            if (hlsSource) {
              hlsInstance.loadSource(hlsSource.src);
            }
          }

          hlsInstance.attachMedia(element);

          hlsInstance.on(HLS.Events.MANIFEST_PARSED, () => {
            isReady.value = true;
            isLoading.value = false;
            setupAnalytics(element, mergedOptions.analytics);
          });

          hlsInstance.on(HLS.Events.ERROR, (event: unknown, data: { fatal?: boolean; type?: number }) => {
            console.error('HLS ошибка:', data);
            if (data.fatal) {
              switch (data.type) {
                case HLS.ErrorTypes.NETWORK_ERROR:
                  console.log('Попытка восстановления после сетевой ошибки');
                  hlsInstance?.startLoad();
                  break;
                case HLS.ErrorTypes.MEDIA_ERROR:
                  console.log('Попытка восстановления после ошибки медиа');
                  hlsInstance?.recoverMediaError();
                  break;
                default:
                  console.log('Критическая ошибка, перезагрузка');
                  hlsInstance?.destroy();
                  isLoading.value = false;
                  break;
              }
            }
          });
        } else {
          console.warn('HLS.js не поддерживается в этом браузере');
          // Fallback на нативный источник
          element.src = videoSrc;
          element.addEventListener('loadedmetadata', () => {
            isReady.value = true;
            isLoading.value = false;
            setupAnalytics(element, mergedOptions.analytics);
          });
        }
      } else {
        // Обычное видео или нативный HLS
        // Удаляем существующие source элементы из шаблона, если есть
        const existingSources = element.querySelectorAll('source');
        existingSources.forEach((source) => source.remove());

        if (mergedOptions.sources && mergedOptions.sources.length > 0) {
          // Добавляем новые source элементы
          mergedOptions.sources.forEach((source) => {
            const sourceElement = document.createElement('source');
            sourceElement.src = source.src;
            sourceElement.type = source.type || 'video/mp4';
            element.appendChild(sourceElement);
          });
        } else {
          // Устанавливаем src напрямую на элемент video
          element.src = videoSrc;
        }

        // Вызываем load() для перезагрузки видео с новыми источниками
        element.load();

        // Обработчики событий
        const handleLoadedMetadata = () => {
          isReady.value = true;
          isLoading.value = false;
          setupAnalytics(element, mergedOptions.analytics);
        };

        const handleCanPlay = () => {
          if (!isReady.value) {
            isReady.value = true;
            isLoading.value = false;
          }
        };

        element.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        element.addEventListener('canplay', handleCanPlay, { once: true });

        // Если видео уже загружено, вызываем обработчик сразу
        if (element.readyState >= HTMLMediaElement.HAVE_METADATA) {
          handleLoadedMetadata();
        }

        // Обработчик ошибок для обычного видео
        const handleError = () => {
          console.error('Ошибка воспроизведения видео');
          isLoading.value = false;
          isReady.value = false;
        };

        element.addEventListener('error', handleError, { once: true });
      }
    } catch (error) {
      console.error('Ошибка инициализации плеера:', error);
      isLoading.value = false;
    }
  };

  const play = async () => {
    if (playerRef.value) {
      try {
        await playerRef.value.play();
      } catch (error) {
        console.error('Ошибка воспроизведения:', error);
      }
    }
  };

  const pause = () => {
    if (playerRef.value) {
      playerRef.value.pause();
    }
  };

  const togglePlay = async () => {
    if (playerRef.value) {
      if (playerRef.value.paused) {
        await play();
      } else {
        pause();
      }
    }
  };

  const setCurrentTime = (time: number) => {
    if (playerRef.value) {
      playerRef.value.currentTime = time;
    }
  };

  const getCurrentTime = (): number => {
    return playerRef.value?.currentTime || 0;
  };

  const getDuration = (): number => {
    return playerRef.value?.duration || 0;
  };

  const setVolume = (volume: number) => {
    if (playerRef.value) {
      playerRef.value.volume = Math.max(0, Math.min(1, volume));
    }
  };

  const getVolume = (): number => {
    return playerRef.value?.volume || 0;
  };

  const setMuted = (muted: boolean) => {
    if (playerRef.value) {
      playerRef.value.muted = muted;
    }
  };

  const isMuted = (): boolean => {
    return playerRef.value?.muted || false;
  };

  const toggleFullscreen = () => {
    if (!playerRef.value) return;

    if (document.fullscreenElement === playerRef.value) {
      document.exitFullscreen();
    } else if (playerRef.value.requestFullscreen) {
      playerRef.value.requestFullscreen();
    } else if ((playerRef.value as any).webkitRequestFullscreen) {
      (playerRef.value as any).webkitRequestFullscreen();
    } else if ((playerRef.value as any).mozRequestFullScreen) {
      (playerRef.value as any).mozRequestFullScreen();
    } else if ((playerRef.value as any).msRequestFullscreen) {
      (playerRef.value as any).msRequestFullscreen();
    }
  };

  const dispose = () => {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }

    if (playerRef.value) {
      playerRef.value.pause();
      playerRef.value.src = '';
      playerRef.value.load();
    }

    playerRef.value = null;
    isReady.value = false;
    hasPlayed.value = false;
    isLoading.value = false;
  };

  onBeforeUnmount(() => {
    dispose();
  });

  return {
    playerRef,
    isLoading,
    isReady,
    hasPlayed,
    initPlayer,
    play,
    pause,
    togglePlay,
    setCurrentTime,
    getCurrentTime,
    getDuration,
    setVolume,
    getVolume,
    setMuted,
    isMuted,
    toggleFullscreen,
    dispose,
  };
}
