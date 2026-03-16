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
  objectFit?: 'cover' | 'contain';
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
  objectFit = 'cover'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
        video.addEventListener('loadedmetadata', () => {
          setIsLoaded(true);
          if (autoPlay && isPlaying) {
            video.play().catch(err => console.warn('Native HLS play blocked:', err));
          }
        });
      } else if (Hls && Hls.isSupported()) {
        // CASE 2: hls.js fallback for other browsers
        const hls = new Hls({
          enableWorker: false, // More stable in some restricted environments
          capLevelToPlayerSize: true,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoaded(true);
          if (autoPlay && isPlaying) {
            video.play().catch(err => console.warn('Hls.js play blocked:', err));
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
      }
    } else {
      // Standard MP4/WebM video
      video.src = url;
      setIsLoaded(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
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
    }
  }, [isPlaying]);

  // Handle mute and volume changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    video.volume = volume;
  }, [isMuted, volume]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      // Essential attributes for iOS/Mobile to allow inline and auto-playback
      playsInline
      // @ts-ignore
      webkit-playsinline="true"
      x5-video-player-type="h5" // Wide mobile compatibility
      muted={isMuted}
      loop={loop}
      onEnded={onEnded}
      onPlay={onPlay}
      onPause={onPause}
      style={{ objectFit }}
      preload="metadata"
    />
  );
};

export default VideoPlayer;
