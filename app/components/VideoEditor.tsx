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
    { id: 'none', name: 'Original', class: '' },
    { id: 'vivid', name: 'Vivid', class: 'saturate-[1.5] contrast-[1.1]', ffmpeg: 'eq=saturation=1.5:contrast=1.1' },
    { id: 'noir', name: 'Noir', class: 'grayscale contrast-[1.2]', ffmpeg: 'format=gray,eq=contrast=1.2' },
    { id: 'warm', name: 'Warm', class: 'sepia-[.3] saturate-[1.2]', ffmpeg: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=saturation=1.2' },
    { id: 'cool', name: 'Cool', class: 'hue-rotate-[180deg] saturate-[0.8]', ffmpeg: 'hue=h=180:s=0.8' },
    { id: 'fade', name: 'Fade', class: 'opacity-[0.9] contrast-[0.9]', ffmpeg: 'eq=contrast=0.9:brightness=-0.05' },
];
const SPEEDS = [0.5, 1, 2] as const;

type Tool = 'none' | 'trim' | 'filter' | 'text' | 'speed' | 'adjust';

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
    const [overlayText, setOverlayText] = useState('');
    const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
    const [adjustments, setAdjustments] = useState({ brightness: 0, contrast: 1, saturation: 1 });
    
    // Slider advanced state
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'bridge' | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
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
            vid.currentTime = time;
            const onSeeked = () => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.5));
                } else {
                    resolve(null);
                }
                vid.removeEventListener('seeked', onSeeked);
            };
            vid.addEventListener('seeked', onSeeked);
        });
    };

    // --- Slider/Trimmer Logic ---
    const startDragging = (e: React.MouseEvent | React.TouchEvent, type: 'start' | 'end' | 'bridge') => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setIsDragging(type);
        setDragStartX(clientX);
        setDragStartTimes({ start: startTime, end: endTime });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !timelineRef.current) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
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
    }, [isDragging, dragStartX, dragStartTimes, startTime, endTime, duration]);

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
            
            // 4. Text Overlay
            if (overlayText) {
                const nodes = await ffmpeg.listDir('/');
                const fontArg = nodes.some(node => node.name === 'font.ttf') ? ':fontfile=font.ttf' : '';
                vfs.push(`drawtext=text='${overlayText.toUpperCase()}':fontcolor=white:fontsize=64${fontArg}:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.4:boxborderw=20`);
            }
            
            if (vfs.length > 0) args.push('-vf', vfs.join(','));

            // 5. Audio Speed (if changed)
            if (speed !== 1) {
                // FFmpeg atempo only supports 0.5 to 2.0.
                args.push('-filter:a', `atempo=${speed}`);
            } else {
                args.push('-c:a', 'copy');
            }
            
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', 'output.mp4');
            await ffmpeg.exec(args);
            const data = await ffmpeg.readFile('output.mp4');
            onSave(new File([data as any], `edited_${file.name}`, { type: 'video/mp4' }));
        } catch (err) {
            console.error('Export Error:', err);
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

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans overflow-hidden select-none">
            {/* Background Studio Pre-loader */}
            <video ref={thumbVideoRef} src={videoUrl} hidden crossOrigin="anonymous" />
            <canvas ref={canvasRef} width={240} height={240} hidden />

            {/* Premium Header */}
            <div className="flex justify-between items-center px-4 py-8 relative z-50">
                <button onClick={onCancel} className="text-white/40 hover:text-white px-2 text-sm font-black uppercase tracking-widest active:scale-90 transition-all">
                    Cancel
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-[0.4em] mb-0.5">Dance Studio</span>
                    <h2 className="text-xs font-black text-white uppercase tracking-widest">{formatTime(endTime - startTime)} Selected</h2>
                </div>
                <button 
                    onClick={handleProcess} 
                    className="bg-white text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                >
                    {isProcessing ? 'Processing' : 'Next'}
                </button>
            </div>

            {/* Fixed Aspect-Ratio Video Stage */}
            <div className="flex-1 relative flex items-center justify-center p-4 min-h-0">
                <div className="relative max-h-[55vh] lg:max-h-full aspect-[9/16] bg-zinc-900/50 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5">
                    <video 
                        ref={videoRef}
                        src={videoUrl} 
                        className={`w-full h-full object-contain transition-all duration-300 ${filter.class}`}
                        style={{
                            filter: `brightness(${1 + adjustments.brightness}) contrast(${adjustments.contrast}) saturate(${adjustments.saturation})`
                        }}
                        onLoadedMetadata={handleLoadedMetadata}
                        playsInline muted loop
                    />
                    
                    {/* Floating Text Preview */}
                    {overlayText && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-6 py-3 bg-black/40 backdrop-blur-xl rounded-2xl text-white font-black text-2xl uppercase tracking-widest shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
                                {overlayText}
                            </div>
                        </div>
                    )}

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

            {/* Bottom Panel System */}
            <div className="relative z-50">
                {/* Modal Sheets (Floating over video area) */}
                <div className="absolute bottom-full left-0 right-0 px-6 pb-4 pointer-events-none">
                    {/* Trimmer Sheet */}
                    <div className={`w-full max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-6 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] pointer-events-auto ${activeTool === 'trim' ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Select Performance Segment</span>
                                <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{formatTime(startTime)} – {formatTime(endTime)}</span>
                            </div>
                            <div ref={timelineRef} className="relative h-16 bg-white/5 rounded-2xl overflow-hidden border border-white/5 ring-1 ring-white/5">
                                <div className="absolute inset-0 flex gap-0.5 p-1 opacity-40">
                                    {thumbnails.map((src, i) => (
                                        <img key={i} src={src} className="flex-1 h-full object-cover rounded-sm" alt="" />
                                    ))}
                                </div>
                                <div 
                                    onMouseDown={(e) => startDragging(e, 'bridge')}
                                    onTouchStart={(e) => startDragging(e, 'bridge')}
                                    className="absolute top-0 bottom-0 border-x-[14px] border-y-[4px] border-pink-500 bg-pink-500/10 backdrop-blur-md cursor-grab active:cursor-grabbing z-20 group"
                                    style={{ 
                                        left: `${(startTime / duration) * 100}%`, 
                                        right: `${100 - (endTime / duration) * 100}%`
                                    }}
                                >
                                    <div 
                                        onMouseDown={(e) => { e.stopPropagation(); startDragging(e, 'start'); }}
                                        onTouchStart={(e) => { e.stopPropagation(); startDragging(e, 'start'); }}
                                        className="absolute -left-[14px] top-0 bottom-0 w-[14px] flex items-center justify-center"
                                    ><div className="w-1 h-6 bg-white/60 rounded-full" /></div>
                                    <div 
                                        onMouseDown={(e) => { e.stopPropagation(); startDragging(e, 'end'); }}
                                        onTouchStart={(e) => { e.stopPropagation(); startDragging(e, 'end'); }}
                                        className="absolute -right-[14px] top-0 bottom-0 w-[14px] flex items-center justify-center"
                                    ><div className="w-1 h-6 bg-white/60 rounded-full" /></div>
                                </div>
                            </div>
                            <p className="text-[9px] text-zinc-500 text-center uppercase tracking-[0.2em] font-black">Drag handles to trim or center to slide</p>
                        </div>
                    </div>

                    {/* Filter Sheet */}
                    <div className={`w-full max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-6 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] absolute inset-x-6 bottom-4 pointer-events-auto ${activeTool === 'filter' ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                         <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x px-2">
                            {FILTERS.map((f) => (
                                <button key={f.id} onClick={() => setFilter(f)} className={`flex-shrink-0 flex flex-col items-center gap-3 transition-active snap-center ${filter.id === f.id ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className={`w-16 h-16 rounded-3xl border-2 transition-all overflow-hidden ${filter.id === f.id ? 'border-pink-500 scale-110 shadow-lg' : 'border-white/10'}`}>
                                        <div className={`w-full h-full bg-zinc-800 ${f.class}`} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-white/60">{f.name}</span>
                                </button>
                            ))}
                         </div>
                    </div>

                    {/* Text Sheet */}
                    <div className={`w-full max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-6 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] absolute inset-x-6 bottom-4 pointer-events-auto ${activeTool === 'text' ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                        <div className="space-y-4">
                            <input 
                                type="text" placeholder="ADD TEXT OVERLAY..." value={overlayText}
                                onChange={(e) => setOverlayText(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-white/20 focus:ring-2 focus:ring-pink-500 outline-none transition-all uppercase tracking-widest text-sm"
                                autoFocus={activeTool === 'text'}
                            />
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setOverlayText('')} className="text-[10px] font-black uppercase text-white/40 hover:text-white">Clear</button>
                                <button onClick={() => setActiveTool('none')} className="text-[10px] font-black uppercase text-pink-500">Done</button>
                            </div>
                        </div>
                    </div>

                    {/* Speed Sheet [NEW] */}
                    <div className={`w-full max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-6 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] absolute inset-x-6 bottom-4 pointer-events-auto ${activeTool === 'speed' ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                        <div className="space-y-6">
                            <span className="block text-[10px] font-black text-white/20 uppercase tracking-[0.3em] text-center">Video Speed</span>
                            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                                {SPEEDS.map((s) => (
                                    <button 
                                        key={s} 
                                        onClick={() => setSpeed(s)}
                                        className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${speed === s ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-white/40 hover:text-white'}`}
                                    >
                                        {s}x
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Adjust Sheet [NEW] */}
                    <div className={`w-full max-w-lg mx-auto bg-zinc-900/90 backdrop-blur-3xl rounded-[2rem] border border-white/10 p-6 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] absolute inset-x-6 bottom-4 pointer-events-auto ${activeTool === 'adjust' ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                        <div className="space-y-6">
                            {[
                                { key: 'brightness', label: 'Brightness', min: -0.5, max: 0.5, step: 0.05, icon: 'M12 2v2m0 16v2m10-10h-2M4 12H2m15.071-7.071l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636' },
                                { key: 'contrast', label: 'Contrast', min: 0.5, max: 1.5, step: 0.05, icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
                                { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.1, icon: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' }
                            ].map((adj) => (
                                <div key={adj.key} className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-2">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/40">
                                                <path d={adj.icon} />
                                            </svg>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{adj.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-pink-500">{adjustments[adj.key as keyof typeof adjustments]}</span>
                                    </div>
                                    <input 
                                        type="range" min={adj.min} max={adj.max} step={adj.step}
                                        value={adjustments[adj.key as keyof typeof adjustments]}
                                        onChange={(e) => setAdjustments({ ...adjustments, [adj.key]: parseFloat(e.target.value) })}
                                        className="w-full accent-pink-500 h-1 bg-white/10 rounded-full appearance-none outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Persistent Tab Navigation Bar */}
                <div className="bg-zinc-950 px-6 py-6 pb-12 flex justify-between items-center border-t border-white/5 gap-2 overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'trim', label: 'Trim', d: 'M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3z' }, // Simplified Camera/Film icon
                        { id: 'filter', label: 'Filter', d: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' }, // Magic Star
                        { id: 'text', label: 'Text', d: 'M4 7V4h16v3M9 20h6M12 4v16' }, // Clear Typography T
                        { id: 'speed', label: 'Speed', d: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' }, // Lightning bolt (Speed)
                        { id: 'adjust', label: 'Adjust', d: 'M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6' } // Advanced Sliders
                    ].map((tab) => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTool(activeTool === tab.id ? 'none' : tab.id as Tool)}
                            className={`flex flex-col items-center gap-2 flex-shrink-0 transition-all active:scale-90 ${activeTool === tab.id ? 'text-pink-500' : 'text-white/40'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTool === tab.id ? 'bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'bg-transparent'}`}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={tab.d} />
                                </svg>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest">{tab.label}</span>
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
