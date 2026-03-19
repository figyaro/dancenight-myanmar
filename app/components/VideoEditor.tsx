'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoEditorProps {
    file: File;
    onSave: (editedFile: File) => void;
    onCancel: () => void;
}

const FILTERS = [
    { id: 'none', name: 'Original', class: '', style: '' },
    { id: 'vivid', name: 'Vivid', class: 'saturate-[1.5] contrast-[1.1]', style: 'saturate(1.5) contrast(1.1)', ffmpeg: 'eq=saturation=1.5:contrast=1.1' },
    { id: 'noir', name: 'Noir', class: 'grayscale contrast-[1.2]', style: 'grayscale(1) contrast(1.2)', ffmpeg: 'format=gray,eq=contrast=1.2' },
    { id: 'vintage', name: 'Vintage', class: 'sepia-[.2] contrast-[1.1] brightness-[1.05] saturate-[.9]', style: 'sepia(0.2) contrast(1.1) brightness(1.05) saturate(0.9)', ffmpeg: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.1:brightness=0.05:saturation=0.9' },
    { id: 'cinema', name: 'Cinema', class: 'contrast-[1.1] saturate-[1.1] hue-rotate-[-10deg]', style: 'contrast(1.1) saturate(1.1) hue-rotate(-10deg)', ffmpeg: 'eq=contrast=1.1:saturation=1.1,hue=h=-10' },
    { id: 'dramatic', name: 'Dramatic', class: 'contrast-[1.4] brightness-[0.9] saturate-[0.8]', style: 'contrast(1.4) brightness(0.9) saturate(0.8)', ffmpeg: 'eq=contrast=1.4:brightness=-0.1:saturation=0.8' },
    { id: 'sepia', name: 'Sepia', class: 'sepia-[0.8]', style: 'sepia(0.8)', ffmpeg: 'sepia=0.8' },
    { id: 'dreamy', name: 'Dreamy', class: 'brightness-[1.1] saturate-[1.2] blur-[0.5px]', style: 'brightness(1.1) saturate(1.2) blur(0.5px)', ffmpeg: 'eq=brightness=0.1:saturation=1.2,boxblur=1:1' },
    { id: 'cool', name: 'Cool', class: 'hue-rotate-[180deg] saturate-[0.8]', style: 'hue-rotate(180deg) saturate(0.8)', ffmpeg: 'hue=h=180:s=0.8' },
    { id: 'fade', name: 'Fade', class: 'opacity-[0.9] contrast-[0.9]', style: 'opacity(0.9) contrast(0.9) brightness(0.95)', ffmpeg: 'eq=contrast=0.9:brightness=-0.05' },
];
const SPEEDS = [0.8, 1, 1.2] as const;

type Tool = 'none' | 'trim' | 'filter' | 'text' | 'speed' | 'adjust';
type AnimationType = 'none' | 'fade' | 'typewriter' | 'bounce';

interface TextOverlay {
    id: string;
    text: string;
    x: number; // 0-100%
    y: number; // 0-100%
    fontSize: number;
    color: string;
    opacity: number;
    bgColor: string;
    bgOpacity: number;
    borderColor: string;
    borderOpacity: number;
    animation: AnimationType;
}

export default function VideoEditor({ file, onSave, onCancel }: VideoEditorProps) {
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(true);
    const [progress, setProgress] = useState(0);
    const [filter, setFilter] = useState(FILTERS[0]);
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<Tool>('none');
    
    // Advanced Text Overlays
    const [overlays, setOverlays] = useState<TextOverlay[]>([]);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    
    const [speed, setSpeed] = useState<0.8 | 1 | 1.2>(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
        }
    }, [speed]);

    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        if (isPlaying) {
            video.play().catch(e => console.warn(e));
            // Smooth playback cursor using RAF
            let rafId: number;
            const update = () => {
                setCurrentTime(video.currentTime);
                rafId = requestAnimationFrame(update);
            };
            rafId = requestAnimationFrame(update);
            return () => cancelAnimationFrame(rafId);
        } else {
            video.pause();
            setCurrentTime(video.currentTime);
        }
    }, [isPlaying]);
    const [adjustments, setAdjustments] = useState({ brightness: 0, contrast: 1, saturation: 1 });
    const [textTab, setTextTab] = useState<'text' | 'bg' | 'border' | 'anim'>('text');
    
    // Slider/Draggable state
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'bridge' | 'text' | 'resize' | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragStartFontSize, setDragStartFontSize] = useState(0);
    const [dragStartTimes, setDragStartTimes] = useState({ start: 0, end: 0 });

    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef<HTMLVideoElement>(null);
    const thumbVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const url = URL.createObjectURL(file);
        setVideoUrl(url);
        loadFfmpeg();
        return () => {
            URL.revokeObjectURL(url);
            thumbnails.forEach(URL.revokeObjectURL);
        };
    }, [file]);

    const loadFfmpeg = async () => {
        try {
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            const ffmpeg = ffmpegRef.current;
            ffmpeg.on('progress', ({ progress }) => setProgress(Math.round(progress * 100)));
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            // Load Font for Text Overlay
            try {
                const fontUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bslnt%2Cwght%5D.ttf';
                const fontData = await fetchFile(fontUrl);
                await ffmpeg.writeFile('font.ttf', fontData);
            } catch (fontErr) {
                console.warn('Font load failed, falling back to default:', fontErr);
            }

            setFfmpegLoaded(true);
        } catch (err) {
            console.error('FFmpeg Load Error:', err);
            setLoadError('Editor offline.');
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const d = videoRef.current.duration;
            setDuration(d);
            setEndTime(Math.min(d, 15));
            generateThumbnails(d);
        }
    };

    const generateThumbnails = useCallback(async (vidDuration: number) => {
        setIsGeneratingThumbs(true);
        // Ensure video is ready before capturing
        if (thumbVideoRef.current) {
             const vid = thumbVideoRef.current;
             if (vid.readyState < 2) {
                 await new Promise(r => vid.addEventListener('loadeddata', r, { once: true }));
             }
        }
        const thumbs: string[] = [];
        const count = 10;
        const interval = vidDuration / count;
        for (let i = 0; i < count; i++) {
            const thumb = await captureFrame(i * interval);
            if (thumb) thumbs.push(thumb);
        }
        setThumbnails(thumbs);
        setIsGeneratingThumbs(false);
    }, []);

    const captureFrame = (time: number): Promise<string | null> => {
        return new Promise((resolve) => {
            const vid = thumbVideoRef.current;
            const canvas = canvasRef.current;
            if (!vid || !canvas) return resolve(null);
            
            // Nudge time slightly to ensure we don't hit a blank frame at 0
            vid.currentTime = Math.max(0.01, time);
            
            const onSeeked = () => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    try {
                        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', 0.5));
                    } catch (e) {
                        console.error("Canvas draw failed", e);
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
                vid.removeEventListener('seeked', onSeeked);
            };
            
            // Timeout fallback for iOS if seeked doesn't fire
            const timeout = setTimeout(() => {
                vid.removeEventListener('seeked', onSeeked);
                onSeeked();
            }, 1000);

            vid.addEventListener('seeked', () => {
                clearTimeout(timeout);
                onSeeked();
            }, { once: true });
        });
    };

    // --- Dragging Logic (Unified) ---
    const startDragging = (e: React.MouseEvent | React.TouchEvent, type: 'start' | 'end' | 'bridge' | 'text' | 'resize', id?: string) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setIsDragging(type);
        setDragStartX(clientX);
        setDragStartY(clientY);
        setDragStartTimes({ start: startTime, end: endTime });
        if (id) {
            setSelectedTextId(id);
            const overlay = overlays.find(o => o.id === id);
            if (overlay) setDragStartFontSize(overlay.fontSize);
        }
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
            
            if (isDragging === 'text' && selectedTextId && stageRef.current) {
                const rect = stageRef.current.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
                const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
                setOverlays(prev => prev.map(o => o.id === selectedTextId ? { ...o, x, y } : o));
                return;
            }

            if (isDragging === 'resize' && selectedTextId) {
                const deltaX = clientX - dragStartX;
                const deltaY = clientY - dragStartY;
                const delta = Math.max(deltaX, deltaY);
                setOverlays(prev => prev.map(o => o.id === selectedTextId ? { ...o, fontSize: Math.max(12, Math.min(200, dragStartFontSize + delta)) } : o));
                return;
            }

            if (!timelineRef.current) return;
            const deltaX = clientX - dragStartX;
            const rect = timelineRef.current.getBoundingClientRect();
            const deltaT = (deltaX / rect.width) * duration;

            if (isDragging === 'start') {
                const ns = Math.max(0, Math.min(dragStartTimes.start + deltaT, endTime - 0.5));
                setStartTime(ns);
                if (videoRef.current) videoRef.current.currentTime = ns;
            } else if (isDragging === 'end') {
                const ne = Math.min(duration, Math.max(startTime + 0.5, dragStartTimes.end + deltaT));
                setEndTime(ne);
                if (videoRef.current) videoRef.current.currentTime = ne;
            } else if (isDragging === 'bridge') {
                const range = dragStartTimes.end - dragStartTimes.start;
                let ns = dragStartTimes.start + deltaT;
                let ne = dragStartTimes.end + deltaT;
                
                if (ns < 0) { ns = 0; ne = range; }
                else if (ne > duration) { ne = duration; ns = duration - range; }
                
                setStartTime(ns);
                setEndTime(ne);
                if (videoRef.current) videoRef.current.currentTime = ns;
            }
        };

        const stopDragging = () => setIsDragging(null);

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', stopDragging);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', stopDragging);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', stopDragging);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', stopDragging);
        };
    }, [isDragging, dragStartX, dragStartY, dragStartFontSize, dragStartTimes, startTime, endTime, duration, selectedTextId, overlays]);

    const handleProcess = async () => {
        if (!ffmpegLoaded) { onSave(file); return; }
        setIsProcessing(true);
        try {
            const ffmpeg = ffmpegRef.current;
            await ffmpeg.writeFile('input.mp4', await fetchFile(file));
            
            const args = ['-ss', startTime.toFixed(2), '-to', endTime.toFixed(2), '-i', 'input.mp4'];
            
            const vfs = [];
            // 1. Speed Adjustment
            if (speed !== 1) {
                vfs.push(`setpts=${1/speed}*PTS`);
            }
            // 2. Image Adjustments (Brightness, Contrast, Saturation)
            vfs.push(`eq=brightness=${adjustments.brightness}:contrast=${adjustments.contrast}:saturation=${adjustments.saturation}`);
            
            // 3. Filters
            if (filter.id !== 'none' && filter.ffmpeg) vfs.push(filter.ffmpeg);
            
            // 4. Multiple Text Overlays
            if (overlays.length > 0) {
                const nodes = await ffmpeg.listDir('/');
                const fontArg = nodes.some(node => node.name === 'font.ttf') ? ':fontfile=font.ttf' : '';
                
                for (const o of overlays) {
                    const alpha = o.opacity;
                    const boxArgs = o.bgOpacity > 0 ? `:box=1:boxcolor=${o.bgColor}@${o.bgOpacity}:boxborderw=10` : '';
                    const borderArgs = o.borderOpacity > 0 ? `:borderw=2:bordercolor=${o.borderColor}@${o.borderOpacity}` : '';
                    
                    let xExpr = `(w-text_w)*${o.x/100}`;
                    let yExpr = `(h-text_h)*${o.y/100}`;
                    let alphaExpr = `${alpha}`;

                    if (o.animation === 'fade') {
                        alphaExpr = `min(${alpha},t/1)`; // 1s fade in
                    } else if (o.animation === 'bounce') {
                        yExpr = `(h-text_h)*${o.y/100} + sin(t*5)*30`;
                    } else if (o.animation === 'typewriter') {
                        // Sequential character appearance (approx)
                        alphaExpr = `if(gt(t,0.3),${alpha},0)`; 
                    }
vfs.push(`drawtext=text='${o.text.toUpperCase()}':fontcolor=${o.color}@${alphaExpr}:fontsize=${o.fontSize}${fontArg}:x=${xExpr}:y=${yExpr}${boxArgs}${borderArgs}`);
                }
            }
            
            if (vfs.length > 0) args.push('-vf', vfs.join(','));

            // 5. Audio Speed (if changed)
            if (speed !== 1) {
                // FFmpeg atempo only supports 0.5 to 2.0.
                args.push('-filter:a', `atempo=${speed}`);
            }
            // Removed -c:a copy to avoid errors on videos with no audio track. Let FFmpeg encode audio if available.
            
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', 'output.mp4');
            await ffmpeg.exec(args);
            const data = await ffmpeg.readFile('output.mp4');
            onSave(new File([data as any], `edited_${file.name}`, { type: 'video/mp4' }));
        } catch (err: any) {
            console.error('Export Error:', err);
            alert(`Video processing failed. Returning standard video. Error: ${err.message || 'Unknown'}`);
            onSave(file);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (s: number) => {
        const secs = Math.floor(s);
        const ms = Math.floor((s % 1) * 10);
        return `${secs}.${ms}s`;
    };

    const stageRef = useRef<HTMLDivElement>(null);

    const addText = () => {
        const newText: TextOverlay = {
            id: Math.random().toString(36).substr(2, 9),
            text: 'NEW TEXT',
            x: 50,
            y: 50,
            fontSize: 40,
            color: '#ffffff',
            opacity: 1,
            bgColor: '#ec4899',
            bgOpacity: 0.8,
            borderColor: '#000000',
            borderOpacity: 0,
            animation: 'none',
        };
        setOverlays([...overlays, newText]);
        setSelectedTextId(newText.id);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans overflow-hidden select-none">
            {/* Background Studio Pre-loader - Using opacity/positioning instead of hidden for iOS canvas capture */}
            <video 
                ref={thumbVideoRef} 
                src={videoUrl} 
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} 
                playsInline 
                muted 
                preload="auto" 
            />
            <canvas ref={canvasRef} width={240} height={240} style={{ display: 'none' }} />

            {/* Premium Header - Ultra Compact */}
            <div className="flex justify-between items-center px-4 pt-2 pb-1 relative z-50">
                <button onClick={onCancel} className="text-white/40 hover:text-white px-2 text-[9px] font-black uppercase tracking-widest active:scale-90 transition-all">
                    Cancel
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[6px] font-black text-pink-500 uppercase tracking-[0.4em]">Studio Pro</span>
                    <h2 className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">{formatTime(endTime - startTime)}</h2>
                </div>
                <button 
                    onClick={handleProcess} 
                    className="bg-white text-black font-black px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                >
                    {isProcessing ? 'Saving...' : 'Finish'}
                </button>
            </div>

            {/* Fixed Aspect-Ratio Video Stage - Maximized */}
            <div className="flex-1 relative flex items-center justify-center p-1 pt-0 min-h-0">
                <div 
                    ref={stageRef} 
                    className="relative max-h-[60vh] lg:max-h-full aspect-[9/16] bg-zinc-900/50 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5 cursor-pointer"
                    onClick={() => {
                        if (activeTool === 'text') return;
                        setIsPlaying((prev) => !prev);
                    }}
                >
                    <video 
                        ref={videoRef}
                        src={videoUrl} 
                        className={`w-full h-full object-contain transition-all duration-300`}
                        style={{
                            filter: `${filter.style} brightness(${1 + adjustments.brightness}) contrast(${adjustments.contrast}) saturate(${adjustments.saturation})`
                        }}
                        onLoadedMetadata={handleLoadedMetadata}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        playsInline 
                        muted 
                        loop
                        autoPlay
                        preload="auto"
                    />

                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-16 h-16 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </div>
                        </div>
                    )}
                    
                    {/* Draggable & Resizable Text System */}
                    {overlays.map((o) => (
                        <div 
                            key={o.id}
                            onMouseDown={(e) => startDragging(e, 'text', o.id)}
                            onTouchStart={(e) => startDragging(e, 'text', o.id)}
                            className={`absolute select-none transition-all ${selectedTextId === o.id ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-transparent cursor-move' : 'cursor-pointer hover:scale-105'}`}
                            style={{ 
                                left: `${o.x}%`, 
                                top: `${o.y}%`, 
                                transform: 'translate(-50%, -50%)',
                                zIndex: selectedTextId === o.id ? 100 : 10,
                                opacity: o.animation === 'fade' && selectedTextId !== o.id ? (selectedTextId === o.id ? 1 : 0.7) : 1,
                            }}
                        >
                            <div 
                                className={`px-4 py-2 font-black uppercase tracking-wider whitespace-nowrap rounded-lg shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all ${o.animation === 'bounce' && selectedTextId !== o.id ? 'animate-bounce' : ''} ${o.animation === 'fade' ? 'animate-in fade-in duration-1000' : ''}`}
                                style={{ 
                                    backgroundColor: o.bgOpacity > 0 ? o.bgColor + Math.floor(o.bgOpacity * 255).toString(16).padStart(2, '0') : 'transparent', 
                                    color: o.color + Math.floor(o.opacity * 255).toString(16).padStart(2, '0'), 
                                    fontSize: `${o.fontSize}px`,
                                    border: o.borderOpacity > 0 ? `2px solid ${o.borderColor + Math.floor(o.borderOpacity * 255).toString(16).padStart(2, '0')}` : 'none'
                                }}
                            >
                                {o.text}
                            </div>
                            
                            {/* Resize Handle */}
                            {selectedTextId === o.id && (
                                <div 
                                    onMouseDown={(e) => { e.stopPropagation(); startDragging(e, 'resize', o.id); }}
                                    onTouchStart={(e) => { e.stopPropagation(); startDragging(e, 'resize', o.id); }}
                                    className="absolute -right-3 -bottom-3 w-7 h-7 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center cursor-nwse-resize shadow-xl active:scale-125 transition-transform"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Rendering Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center z-[70] animate-in fade-in duration-500">
                            <div className="w-24 h-24 relative mb-6">
                                <svg className="w-full h-full text-white/5 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" stroke="#ec4899" strokeWidth="4" 
                                        strokeDasharray="283" strokeDashoffset={283 - (283 * (progress / 100))} 
                                        strokeLinecap="round" className="transition-all duration-300"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-black text-pink-500 text-xl">{progress}%</div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40 animate-pulse">Encoding performance</span>
                        </div>
                    )}

                    {/* Editor Syncing Overlay */}
                    {!ffmpegLoaded && !loadError && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-50">
                            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500/50">Studio Syncing</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Panel System - Fixed Overflow and Interactions */}
            <div className="relative z-50">
                {/* Master Modal Container - Ensuring no vertical/horizontal overflow */}
                <div className="absolute bottom-full left-0 right-0 px-4 pb-2 pointer-events-none flex flex-col items-center">
                    
                    {/* Trimmer Sheet */}
                    <div 
                        className={`w-full max-w-lg bg-zinc-900/95 backdrop-blur-3xl rounded-[1.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${activeTool === 'trim' ? 'translate-y-0 opacity-100 pointer-events-auto visible' : 'translate-y-8 opacity-0 pointer-events-none invisible absolute'}`}
                        style={{ zIndex: activeTool === 'trim' ? 50 : 0 }}
                    >
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Select Segment</span>
                                <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest">{formatTime(startTime)} – {formatTime(endTime)}</span>
                            </div>
                            <div ref={timelineRef} className="relative h-12 bg-white/5 rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/5">
                                <div className="absolute inset-0 flex gap-0.5 p-0.5 opacity-40">
                                    {thumbnails.map((src, i) => (
                                        <img key={i} src={src} className="flex-1 h-full object-cover rounded-sm" alt="" />
                                    ))}
                                </div>
                                {/* Playback Position Cursor */}
                                {duration > 0 && (
                                    <div 
                                        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                                        style={{ left: `${(currentTime / duration) * 100}%` }}
                                    >
                                        <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white rotate-45 shadow-sm" />
                                    </div>
                                )}
                                <div 
                                    onMouseDown={(e) => startDragging(e, 'bridge')}
                                    onTouchStart={(e) => startDragging(e, 'bridge')}
                                    className="absolute top-0 bottom-0 border-x-[12px] border-y-[1px] border-pink-500/60 bg-pink-500/10 backdrop-blur-sm cursor-grab active:cursor-grabbing z-20 group"
                                    style={{ 
                                        left: `${(startTime / duration) * 100}%`, 
                                        right: `${100 - (endTime / duration) * 100}%`
                                    }}
                                >
                                    <div 
                                        onMouseDown={(e) => { e.stopPropagation(); startDragging(e, 'start'); }}
                                        onTouchStart={(e) => { e.stopPropagation(); startDragging(e, 'start'); }}
                                        className="absolute -left-[12px] top-0 bottom-0 w-[12px] flex items-center justify-center cursor-ew-resize"
                                    ><div className="w-1.5 h-6 bg-white rounded-full shadow-lg" /></div>
                                    <div 
                                        onMouseDown={(e) => { e.stopPropagation(); startDragging(e, 'end'); }}
                                        onTouchStart={(e) => { e.stopPropagation(); startDragging(e, 'end'); }}
                                        className="absolute -right-[12px] top-0 bottom-0 w-[12px] flex items-center justify-center cursor-ew-resize"
                                    ><div className="w-1.5 h-6 bg-white rounded-full shadow-lg" /></div>
                                </div>
                            </div>
                            <p className="text-[7px] text-zinc-500 text-center uppercase tracking-[0.2em] font-black">Slide central area to shift window</p>
                        </div>
                    </div>

                     <div 
                        className={`w-full max-w-lg bg-zinc-900/95 backdrop-blur-3xl rounded-[1.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${activeTool === 'filter' ? 'translate-y-0 opacity-100 pointer-events-auto visible' : 'translate-y-8 opacity-0 pointer-events-none invisible absolute'}`}
                        style={{ zIndex: activeTool === 'filter' ? 50 : 0 }}
                    >
                         <div className="relative group">
                             <button
                                 onClick={(e) => { e.preventDefault(); const c = document.getElementById('filter-scroll'); if (c) c.scrollBy({ left: -150, behavior: 'smooth' }); }}
                                 className="absolute -left-4 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-900 to-transparent z-20 flex items-center justify-start text-white/50 active:text-white"
                             >
                                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                             </button>
                             <button
                                 onClick={(e) => { e.preventDefault(); const c = document.getElementById('filter-scroll'); if (c) c.scrollBy({ left: 150, behavior: 'smooth' }); }}
                                 className="absolute -right-4 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-900 to-transparent z-20 flex items-center justify-end text-white/50 active:text-white"
                             >
                                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                             </button>
                             <div id="filter-scroll" className="flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-hide snap-x px-4 scroll-smooth">
                                {FILTERS.map((f) => (
                                    <button 
                                        key={f.id} 
                                        onClick={() => setFilter(f)} 
                                        className={`flex-shrink-0 flex flex-col items-center gap-2 transition-all snap-center group`}
                                    >
                                        <div className={`w-16 h-16 rounded-[1.2rem] border-[2.5px] transition-all flex items-center justify-center relative overflow-hidden ${filter.id === f.id ? 'border-pink-500 scale-105 shadow-xl shadow-pink-500/30' : 'border-white/10 group-hover:border-white/20'}`}>
                                            {/* Filter Thumbnail with real CSS effect */}
                                            <div className="absolute inset-0 bg-zinc-800">
                                               {thumbnails[2] && (
                                                    <img 
                                                        src={thumbnails[2]} 
                                                        className="w-full h-full object-cover opacity-60" 
                                                        style={{ filter: f.style }}
                                                        alt="" 
                                                    />
                                                )}
                                            </div>
                                            <div className={`absolute inset-0 bg-black/20 ${filter.id === f.id ? 'opacity-0' : 'opacity-100'}`} />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors ${filter.id === f.id ? 'text-white' : 'text-white/30'}`}>{f.name}</span>
                                    </button>
                                ))}
                             </div>
                         </div>
                    </div>

                    <div 
                        className={`w-full max-w-lg bg-zinc-900/98 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${activeTool === 'text' ? 'translate-y-0 opacity-100 pointer-events-auto visible' : 'translate-y-8 opacity-0 pointer-events-none invisible absolute'}`}
                        style={{ zIndex: activeTool === 'text' ? 50 : 0 }}
                    >
                        <div className="space-y-3">
                            {!selectedTextId ? (
                                <button 
                                    onClick={addText}
                                    className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-pink-600/20 active:scale-95 transition-all text-sm tracking-widest uppercase"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                                    Add New Overlay
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
                                    {/* Pro Input Header */}
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1 relative group">
                                            <input 
                                                type="text" 
                                                value={overlays.find(o => o.id === selectedTextId)?.text || ''}
                                                onChange={(e) => setOverlays(prev => prev.map(o => o.id === selectedTextId ? { ...o, text: e.target.value } : o))}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white font-black placeholder:text-white/10 outline-none transition-all uppercase tracking-widest text-xs"
                                                placeholder="CAPTION..."
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button 
                                                onClick={() => setSelectedTextId(null)}
                                                className="bg-green-600 text-white p-2 rounded-xl active:scale-90 transition-all"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setOverlays(prev => prev.filter(o => o.id !== selectedTextId));
                                                    setSelectedTextId(null);
                                                }}
                                                className="bg-zinc-800 text-red-500 p-2 rounded-xl border border-white/5 active:scale-90 transition-all"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Styling Tabs */}
                                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                        {(['text', 'bg', 'border', 'anim'] as const).map(tab => (
                                            <button 
                                                key={tab}
                                                onClick={() => setTextTab(tab)}
                                                className={`flex-1 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${textTab === tab ? 'bg-zinc-800 text-pink-500 shadow-xl' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div className="space-y-4 px-1">
                                        {textTab !== 'anim' ? (
                                            <>
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Color Palette</span>
                                                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x">
                                                        {['#ffffff', '#000000', '#ec4899', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444'].map(color => {
                                                            const current = overlays.find(o => o.id === selectedTextId);
                                                            const isActive = textTab === 'text' ? current?.color === color : textTab === 'bg' ? current?.bgColor === color : current?.borderColor === color;
                                                            return (
                                                                <button 
                                                                    key={color}
                                                                    onClick={() => setOverlays(prev => prev.map(o => o.id === selectedTextId ? { 
                                                                        ...o, 
                                                                        [textTab === 'text' ? 'color' : textTab === 'bg' ? 'bgColor' : 'borderColor']: color 
                                                                    } : o))}
                                                                    className={`w-8 h-8 rounded-[1rem] border-2 transition-all flex-shrink-0 snap-center ${isActive ? 'border-pink-500 scale-110 shadow-lg shadow-pink-500/30' : 'border-white/10'}`}
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Opacity</span>
                                                        <span className="text-xs font-black text-pink-500">{Math.round((overlays.find(o => o.id === selectedTextId)?.[textTab === 'text' ? 'opacity' : textTab === 'bg' ? 'bgOpacity' : 'borderOpacity'] || 0) * 100)}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="1" step="0.01"
                                                        value={overlays.find(o => o.id === selectedTextId)?.[textTab === 'text' ? 'opacity' : textTab === 'bg' ? 'bgOpacity' : 'borderOpacity'] || 0}
                                                        onChange={(e) => setOverlays(prev => prev.map(o => o.id === selectedTextId ? { 
                                                            ...o, 
                                                            [textTab === 'text' ? 'opacity' : textTab === 'bg' ? 'bgOpacity' : 'borderOpacity']: parseFloat(e.target.value) 
                                                        } : o))}
                                                        className="w-full h-1.5 bg-white/10 rounded-full appearance-none outline-none accent-pink-500"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3 pb-2">
                                                {(['none', 'fade', 'bounce', 'typewriter'] as const).map(anim => (
                                                    <button 
                                                        key={anim}
                                                        onClick={() => setOverlays(prev => prev.map(o => o.id === selectedTextId ? { ...o, animation: anim } : o))}
                                                        className={`py-3 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${overlays.find(o => o.id === selectedTextId)?.animation === anim ? 'border-pink-500 bg-pink-500/10 text-white shadow-xl' : 'border-white/5 bg-white/5 text-white/40 hover:text-white'}`}
                                                    >
                                                        {anim}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {overlays.length > 0 && !selectedTextId && (
                                <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                                    {overlays.map((o, i) => (
                                        <button 
                                            key={o.id}
                                            onClick={() => setSelectedTextId(o.id)}
                                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white/60 uppercase whitespace-nowrap active:scale-95 transition-all"
                                        >
                                            #{i + 1}: {o.text.substring(0, 10)}{o.text.length > 10 ? '...' : ''}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Speed Sheet */}
                    <div 
                        className={`w-full max-w-lg bg-zinc-900/95 backdrop-blur-3xl rounded-[1.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${activeTool === 'speed' ? 'translate-y-0 opacity-100 pointer-events-auto visible' : 'translate-y-8 opacity-0 pointer-events-none invisible absolute'}`}
                        style={{ zIndex: activeTool === 'speed' ? 50 : 0 }}
                    >
                        <div className="space-y-4">
                            <span className="block text-[10px] font-black text-white/20 uppercase tracking-[0.4em] text-center">Video Intensity</span>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                                {SPEEDS.map((s) => (
                                    <button 
                                        key={s} 
                                        onClick={() => setSpeed(s)}
                                        className={`flex-1 py-3 rounded-lg font-black text-[10px] transition-all ${speed === s ? 'bg-pink-500 text-white shadow-xl shadow-pink-500/20' : 'text-white/40 hover:text-white'}`}
                                    >
                                        {s === 0.8 ? 'SLOW' : s === 1.2 ? 'FAST' : 'NORMAL'}
                                        <div className="text-[8px] opacity-40 mt-0.5">{s}x</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Adjust Sheet */}
                    <div 
                        className={`w-full max-w-lg bg-zinc-900/95 backdrop-blur-3xl rounded-[1.5rem] border border-white/10 p-4 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${activeTool === 'adjust' ? 'translate-y-0 opacity-100 pointer-events-auto visible' : 'translate-y-8 opacity-0 pointer-events-none invisible absolute'}`}
                        style={{ zIndex: activeTool === 'adjust' ? 50 : 0 }}
                    >
                        <div className="space-y-5">
                            {[
                                { key: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.05, icon: 'M12 2v2m0 16v2m10-10h-2M4 12H2m15.071-7.071l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636' },
                                { key: 'contrast', label: 'Contrast', min: 0.5, max: 1.5, step: 0.05, icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
                                { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.1, icon: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' }
                            ].map((adj) => (
                                <div key={adj.key} className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-2">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-pink-500/40">
                                                <path d={adj.icon} />
                                            </svg>
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{adj.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-pink-500 tabular-nums">{(adjustments[adj.key as keyof typeof adjustments] * 100).toFixed(0)}%</span>
                                    </div>
                                    <input 
                                        type="range" min={adj.min} max={adj.max} step={adj.step}
                                        value={adjustments[adj.key as keyof typeof adjustments]}
                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: parseFloat(e.target.value) })}
                                        className="w-full h-1 bg-white/5 rounded-full appearance-none outline-none accent-pink-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Persistent Tab Navigation Bar - Slimmer */}
                <div className="bg-zinc-950 px-4 py-3 pb-8 flex justify-around items-center border-t border-white/5 gap-0 relative">
                    <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                    {[
                        { id: 'trim', label: 'Trim', d: 'M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z' },
                        { id: 'filter', label: 'Filter', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
                        { id: 'text', label: 'Text', d: 'M4 7V4h16v3M9 20h6M12 4v16' },
                        { id: 'speed', label: 'Speed', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
                        { id: 'adjust', label: 'Adjust', d: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6' }
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => {
                                setActiveTool(activeTool === tab.id ? 'none' : tab.id as Tool);
                                if (tab.id !== 'text') setSelectedTextId(null);
                            }}
                            className={`flex flex-col items-center gap-1.5 flex-1 min-w-[60px] transition-all active:scale-90 ${activeTool === tab.id ? 'text-pink-500' : 'text-white/40'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTool === tab.id ? 'bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-transparent'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={tab.d} />
                                </svg>
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .transition-active:active { transform: scale(0.95); }
            `}</style>
        </div>
    );
}
