'use client';

import React, { useEffect, useRef, useState } from 'react';

// Attempt to import Hls, but handle its absence gracefully (since npm install might fail in some environments)
let Hls: any = null;
try {
  // @ts-ignore
  Hls = require('hls.js').default;
} catch (e) {
  // hls.js not available
}

interface VideoPlayerProps {
  url: string;
  poster?: string;
  className?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  volume?: number;
  loop?: boolean;
  autoPlay?: boolean;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onProgress?: (buffered: number) => void;
  seekTo?: number; // External seek trigger
  objectFit?: 'cover' | 'contain';
  preload?: 'auto' | 'metadata' | 'none';
}

/**
 * Enhanced Video Player with iOS-first HLS optimization.
 * Prioritizes native HLS support (Safari/iOS) for maximum stability.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  url,
  poster,
  className = '',
  isPlaying = true,
  isMuted = true,
  volume = 1,
  loop = true,
  autoPlay = true,
  onEnded,
  onPlay,
  onPause,
  onTimeUpdate,
  onDurationChange,
  onProgress,
  seekTo,
  objectFit = 'cover',
  preload = 'auto'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle external seek requests
  useEffect(() => {
    if (videoRef.current && seekTo !== undefined) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHLS = url.toLowerCase().endsWith('.m3u8') || url.includes('playlist.m3u8');

    if (isHLS) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // CASE 1: iOS/Safari Native HLS Support (Highest Priority)
        video.src = url;
        video.load(); // Explicitly call load for iOS
        
        const handleLoadedMetadata = () => {
          setIsLoaded(true);
          if (onDurationChange) onDurationChange(video.duration);
          if (autoPlay && isPlaying) {
            video.play().catch(err => console.warn('Native HLS play blocked:', err));
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      } else if (Hls && Hls.isSupported()) {
        // CASE 2: hls.js fallback for other browsers
        // Optimized settings for mobile/low-latency startup (TikTok-like)
        const hls = new Hls({
          enableWorker: true, 
          capLevelToPlayerSize: true,
          liveSyncDurationCount: 3,
          maxBufferLength: 5,           // Extremely tight buffer for fast start
          maxMaxBufferLength: 10,
          maxBufferSize: 30 * 1000 * 1000, // 30MB
          backBufferLength: 0,          // No back buffer on mobile to save memory
          startLevel: 0,                // Always start at lowest quality for instant playback
          abrEwmaDefaultEstimate: 500000,
          manifestLoadingMaxRetry: 5,
          levelLoadingMaxRetry: 5,
          nudgeOffset: 0.1,             // Skip small gaps to prevent stalling
          nudgeMaxRetry: 10,
        });
        
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
          setIsLoaded(true);
          if (autoPlay && isPlaying) {
            video.play().catch(err => console.warn('Hls.js play blocked:', err));
          }
        });

        hls.on(Hls.Events.LEVEL_LOADED, (event: any, data: any) => {
          if (data.details.totalduration && onDurationChange) {
            onDurationChange(data.details.totalduration);
          }
        });

        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else {
        // CASE 3: Standard fallback (might fail if not supported by browser)
        video.src = url;
        video.load();
      }
    } else {
      // Standard MP4/WebM video
      video.src = url;
      video.load();
      // Wait for metadata to get duration
      const handleMetadata = () => {
        setIsLoaded(true);
        if (onDurationChange) onDurationChange(video.duration);
      };
      video.addEventListener('loadedmetadata', handleMetadata);
      return () => video.removeEventListener('loadedmetadata', handleMetadata);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.removeAttribute('src'); // For native iOS
        video.load(); // Flush buffer
      }
    };
  }, [url, autoPlay]);

  // Handle play/pause state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          // Auto-play might be blocked by browser policy
          console.warn('Playback triggered but possibly blocked:', err);
        });
      }
    } else {
      video.pause();
      // On some versions of iOS, pause() doesn't immediately stop the audio buffer
      // Explicitly muting helps prevent "leakage"
      video.muted = true;
    }
  }, [isPlaying]);

  // Handle mute and volume changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = volume;

    // If we are unmuting, ensure we attempt to play (to catch cases where browser blocked earlier)
    if (!isMuted && isPlaying) {
      video.play().catch(() => {});
    }
  }, [isMuted, volume, isPlaying]);

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleProgress = () => {
    if (videoRef.current && onProgress && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      onProgress(bufferedEnd);
    }
  };

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      // Essential attributes for iOS/Mobile to allow inline and auto-playback
      playsInline
      // @ts-ignore
      webkit-playsinline="true"
      x5-video-player-type="h5" // Wide mobile compatibility
      muted={isMuted}
      autoPlay={autoPlay}
      loop={loop}
      onEnded={onEnded}
      onPlay={onPlay}
      onPause={onPause}
      onTimeUpdate={handleTimeUpdate}
      onProgress={handleProgress}
      style={{ objectFit }}
      preload={preload}
    />
  );
};

export default VideoPlayer;
