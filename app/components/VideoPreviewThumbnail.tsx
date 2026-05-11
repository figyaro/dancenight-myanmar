'use client';

import { useEffect, useRef, useState } from 'react';
import { getBunnyStreamHLSUrl, getBunnyStreamThumbnailUrl, isBunnyStream, isVideo } from '../../lib/bunny';
import VideoPlayer from './VideoPlayer';

interface VideoPreviewThumbnailProps {
    mediaUrl?: string | null;
    title?: string;
    className?: string;
    imageClassName?: string;
    iconClassName?: string;
    onOpen?: () => void;
}

export default function VideoPreviewThumbnail({
    mediaUrl,
    title = '',
    className = '',
    imageClassName = '',
    iconClassName = 'top-2 right-2 w-5 h-5 rounded-md',
    onOpen,
}: VideoPreviewThumbnailProps) {
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [posterFailed, setPosterFailed] = useState(false);
    const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isPlayable = !!mediaUrl && (isBunnyStream(mediaUrl) || isVideo(mediaUrl));
    const isBunnyVideo = !!mediaUrl && isBunnyStream(mediaUrl);
    const previewUrl = mediaUrl
        ? (isBunnyVideo ? (getBunnyStreamHLSUrl(mediaUrl) || mediaUrl) : mediaUrl)
        : '';
    const posterUrl = mediaUrl && isBunnyVideo ? getBunnyStreamThumbnailUrl(mediaUrl) : null;
    const usablePosterUrl = posterUrl && !posterFailed ? posterUrl : null;

    const clearStopTimer = () => {
        if (stopTimerRef.current) {
            clearTimeout(stopTimerRef.current);
            stopTimerRef.current = null;
        }
    };

    const startPreview = () => {
        if (!isPlayable) return;
        clearStopTimer();
        setIsPreviewing(true);
    };

    const stopPreview = () => {
        clearStopTimer();
        setIsPreviewing(false);
    };

    const handleClick = () => {
        if (!isPlayable) {
            onOpen?.();
            return;
        }

        if (isPreviewing) {
            onOpen?.();
            return;
        }

        startPreview();
        stopTimerRef.current = setTimeout(() => {
            setIsPreviewing(false);
            stopTimerRef.current = null;
        }, 3500);
    };

    useEffect(() => {
        return () => clearStopTimer();
    }, []);

    useEffect(() => {
        setPosterFailed(false);
        setIsPreviewing(false);
    }, [mediaUrl]);

    const renderMediaFallback = () => (
        <div className={`w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 ${imageClassName}`}>
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" className="translate-x-0.5">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </div>
        </div>
    );

    return (
        <div
            role="button"
            tabIndex={0}
            onMouseEnter={startPreview}
            onMouseLeave={stopPreview}
            onFocus={startPreview}
            onBlur={stopPreview}
            onClick={handleClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleClick();
                }
            }}
            className={`relative w-full h-full overflow-hidden ${className}`}
            aria-label={title ? `Open ${title}` : 'Open media'}
        >
            {mediaUrl ? (
                isPlayable && isPreviewing ? (
                    <VideoPlayer
                        url={previewUrl}
                        poster={usablePosterUrl || undefined}
                        className={`w-full h-full ${imageClassName}`}
                        isPlaying
                        isMuted
                        volume={0}
                        autoPlay
                        loop
                        objectFit="cover"
                        preload="auto"
                    />
                ) : usablePosterUrl ? (
                    <img
                        src={usablePosterUrl}
                        className={`w-full h-full object-cover ${imageClassName}`}
                        alt={title}
                        onError={() => setPosterFailed(true)}
                    />
                ) : isPlayable && !isBunnyVideo ? (
                    <video
                        src={mediaUrl}
                        className={`w-full h-full object-cover ${imageClassName}`}
                        muted
                        playsInline
                        preload="metadata"
                    />
                ) : isPlayable ? (
                    renderMediaFallback()
                ) : (
                    <img
                        src={mediaUrl}
                        className={`w-full h-full object-cover ${imageClassName}`}
                        alt={title}
                        onError={() => setPosterFailed(true)}
                    />
                )
            ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </div>
            )}

            {isPlayable && (
                <div className={`absolute ${iconClassName} bg-black/45 backdrop-blur-md flex items-center justify-center transition-all duration-300 ${isPreviewing ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            )}
        </div>
    );
}
