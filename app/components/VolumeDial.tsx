'use client';

import { useState, useRef, useEffect } from 'react';

interface VolumeDialProps {
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
}

export default function VolumeDial({ volume, isMuted, onVolumeChange, onMuteToggle }: VolumeDialProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dialRef = useRef<HTMLDivElement>(null);

    const calculateVolume = (clientX: number, clientY: number) => {
        if (!dialRef.current) return;
        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate angle from center
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Adjust angle to start from top and go clockwise (0 to 360)
        angle = (angle + 90 + 360) % 360;
        
        // Map 0-360 to 0-1 volume
        const newVolume = Math.min(1, Math.max(0, angle / 360));
        onVolumeChange(newVolume);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        calculateVolume(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        calculateVolume(e.touches[0].clientX, e.touches[0].clientY);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) calculateVolume(e.clientX, e.clientY);
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (isDragging) {
                // Prevent scrolling while adjusting volume
                if (e.cancelable) e.preventDefault();
                calculateVolume(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    const circumference = 2 * Math.PI * 24; // r=24
    const offset = circumference - (isMuted ? 0 : volume) * circumference;

    return (
        <div className="flex flex-col items-center gap-2 group relative">
            {/* Volume Percentage Tooltip */}
            {isDragging && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-600 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg animate-in fade-in zoom-in duration-200">
                    {Math.round(volume * 100)}%
                </div>
            )}

            <div 
                ref={dialRef}
                className="relative w-14 h-14 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                {/* Dial Ring Background */}
                <svg width="56" height="56" className="absolute inset-0 -rotate-90">
                    <circle
                        cx="28"
                        cy="28"
                        r="24"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        className="text-white/10"
                    />
                    {/* Progress Ring */}
                    <circle
                        cx="28"
                        cy="28"
                        r="24"
                        stroke={isMuted ? "#52525b" : "#db2777"} // zinc-600 or pink-600
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={circumference}
                        style={{ 
                            strokeDashoffset: offset,
                            transition: isDragging ? 'none' : 'stroke-dashoffset 0.3s ease'
                        }}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Center Toggle Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onMuteToggle();
                    }}
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-zinc-800 text-zinc-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {isMuted ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="1" y1="1" x2="23" y2="23" />
                            <path d="M9 9l-5 5H2v-4h2l5-5v2" />
                            <path d="M11 4.5V9" />
                            <path d="M11 15v4.5l-5-5H4v-4h2l1-.9" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                    )}
                </button>
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 drop-shadow-md">Vol</span>
        </div>
    );
}
