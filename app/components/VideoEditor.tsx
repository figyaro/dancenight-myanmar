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

type Tool = 'trim' | 'filter' | 'text';

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
    const [activeTool, setActiveTool] = useState<Tool>('trim');
    const [overlayText, setOverlayText] = useState('');
    
    // Slider state
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'bridge' | null>(null);
    const [dragStartPos, setDragStartPos] = useState(0);
    const [dragStartTime, setDragStartTime] = useState(0);
    const [dragEndTime, setDragEndTime] = useState(0);

    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef<HTMLVideoElement>(null);
    const thumbVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    // Initial setup
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
            ffmpeg.on('log', ({ message }) => console.log('FFmpeg:', message));
            ffmpeg.on('progress', ({ progress }) => setProgress(Math.round(progress * 100)));
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            setFfmpegLoaded(true);
        } catch (err) {
            console.error('FFmpeg Load Error:', err);
            setLoadError('Failed to initialize editor.');
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
        const count = 12;
        const interval = vidDuration / count;
        for (let i = 0; i < count; i++) {
            const time = i * interval;
            const thumb = await captureFrame(time);
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

    // --- Slider Logic ---
    const handleSliderInteract = (e: React.MouseEvent | React.TouchEvent, type: 'start' | 'end' | 'bridge') => {
        setIsDragging(type);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setDragStartPos(clientX);
        setDragStartTime(startTime);
        setDragEndTime(endTime);
    };

    useEffect(() => {
        const onMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging || !sliderRef.current) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const deltaX = clientX - dragStartPos;
            const sliderWidth = sliderRef.current.offsetWidth;
            const deltaT = (deltaX / sliderWidth) * duration;

            if (isDragging === 'start') {
                const newStart = Math.max(0, Math.min(dragStartTime + deltaT, endTime - 1));
                setStartTime(newStart);
                if (videoRef.current) videoRef.current.currentTime = newStart;
            } else if (isDragging === 'end') {
                const newEnd = Math.max(startTime + 1, Math.min(dragEndTime + deltaT, duration));
                setEndTime(newEnd);
                if (videoRef.current) videoRef.current.currentTime = newEnd;
            } else if (isDragging === 'bridge') {
                const d = dragEndTime - dragStartTime;
                let newStart = dragStartTime + deltaT;
                let newEnd = dragEndTime + deltaT;
                if (newStart < 0) {
                    newStart = 0;
                    newEnd = d;
                } else if (newEnd > duration) {
                    newEnd = duration;
                    newStart = duration - d;
                }
                setStartTime(newStart);
                setEndTime(newEnd);
                if (videoRef.current) videoRef.current.currentTime = newStart;
            }
        };

        const onUp = () => setIsDragging(null);

        if (isDragging) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            window.addEventListener('touchmove', onMove);
            window.addEventListener('touchend', onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
        };
    }, [isDragging, dragStartPos, dragStartTime, dragEndTime, startTime, endTime, duration]);

    const handleProcess = async () => {
        if (!ffmpegLoaded) {
            onSave(file);
            return;
        }
        setIsProcessing(true);
        try {
            const ffmpeg = ffmpegRef.current;
            const inputName = 'input.mp4';
            const outputName = 'output.mp4';
            await ffmpeg.writeFile(inputName, await fetchFile(file));

            const args = ['-ss', startTime.toFixed(2), '-to', endTime.toFixed(2), '-i', inputName];
            
            const vfs: string[] = [];
            if (filter.id !== 'none' && filter.ffmpeg) vfs.push(filter.ffmpeg);
            if (overlayText) {
                // Simplified drawtext for demonstration. Font path depends on environment.
                // vfs.push(`drawtext=text='${overlayText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`);
            }
            if (vfs.length > 0) args.push('-vf', vfs.join(','));

            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '25', '-c:a', 'copy', outputName);
            await ffmpeg.exec(args);

            const data = await ffmpeg.readFile(outputName);
            const editedFile = new File([data as any], `edited_${file.name}`, { type: 'video/mp4' });
            onSave(editedFile);
        } catch (err) {
            console.error('Export error:', err);
            onSave(file);
        } finally {
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const s = Math.floor(seconds);
        const ms = Math.floor((seconds % 1) * 10);
        return `${s}.${ms}s`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center select-none animate-in fade-in duration-300 font-sans overflow-hidden">
            {/* Hidden Helpers */}
            <video ref={thumbVideoRef} src={videoUrl} hidden crossOrigin="anonymous" />
            <canvas ref={canvasRef} width={240} height={240} hidden />

            {/* Slim Header */}
            <div className="w-full flex justify-between items-center px-4 pt-6 pb-2 relative z-50">
                <button onClick={onCancel} className="text-white/60 hover:text-white px-2 py-1 text-sm font-bold transition-all active:scale-90">
                    Cancel
                </button>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">
                    {activeTool === 'trim' ? 'Trimming' : activeTool === 'filter' ? 'Filtering' : 'Adding Text'}
                </div>
                <button 
                    onClick={handleProcess} 
                    className="bg-white text-black font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest active:scale-95 shadow-xl transition-all"
                >
                    {isProcessing ? 'Saving' : 'Save'}
                </button>
            </div>

            {/* Video Stage: 9:16 Optimized Center */}
            <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden py-2 px-10">
                <div className="relative h-full aspect-[9/16] bg-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5 group">
                    <video 
                        ref={videoRef}
                        src={videoUrl} 
                        className={`w-full h-full object-contain transition-all duration-300 ${filter.class}`}
                        onLoadedMetadata={handleLoadedMetadata}
                        playsInline muted loop
                    />
                    
                    {/* Text Overlay Preview */}
                    {overlayText && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-lg text-white font-black text-2xl uppercase tracking-widest shadow-2xl border border-white/20">
                                {overlayText}
                            </div>
                        </div>
                    )}

                    {/* Right Menu (Vertical) */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50">
                        {[
                            { id: 'trim', icon: 'M4 12V4L20 12L4 20V12' },
                            { id: 'filter', icon: 'M12 2L2 7L12 12L22 7L12 2Z' },
                            { id: 'text', icon: 'M5 7h14m-7 0v12' }
                        ].map((btn) => (
                            <button 
                                key={btn.id}
                                onClick={() => setActiveTool(btn.id as Tool)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTool === btn.id ? 'bg-pink-500 shadow-[0_0_20px_#ec4899]' : 'bg-white/10 backdrop-blur-md border border-white/10'}`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                    <path d={btn.icon} />
                                </svg>
                            </button>
                        ))}
                    </div>

                    {/* Pre-load Overlay */}
                    {!ffmpegLoaded && !loadError && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center z-[60]">
                            <div className="w-24 h-24 relative mb-4">
                                <svg className="w-full h-full text-white/5 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" stroke="#ec4899" strokeWidth="4" 
                                        strokeDasharray="283" strokeDashoffset={283 - (283 * (progress / 100))} 
                                        strokeLinecap="round" className="transition-all duration-300"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-black text-white">{progress}%</div>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500 animate-pulse">Initializing Studio</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modular Workspace Footer */}
            <div className="w-full max-w-lg px-6 py-6 pb-10 bg-black/80 backdrop-blur-3xl border-t border-white/5 relative z-50">
                {activeTool === 'trim' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-white/40 uppercase tracking-widest px-1">
                            <span>{formatTime(startTime)}</span>
                            <span className="text-pink-500">{formatTime(endTime - startTime)} selected</span>
                            <span>{formatTime(endTime)}</span>
                        </div>
                        <div ref={sliderRef} className="relative h-16 bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                            <div className="absolute inset-0 flex gap-0.5 p-1 opacity-30">
                                {thumbnails.map((src, i) => (
                                    <img key={i} src={src} className="flex-1 h-full object-cover rounded-sm grayscale" alt="" />
                                ))}
                            </div>
                            {/* The "Bridge" area to slide entire selection */}
                            <div 
                                onMouseDown={(e) => handleSliderInteract(e, 'bridge')}
                                onTouchStart={(e) => handleSliderInteract(e, 'bridge')}
                                className="absolute top-0 bottom-0 border-x-[14px] border-y-[4px] border-pink-500 bg-pink-500/10 backdrop-blur-sm cursor-grab active:cursor-grabbing z-20 group"
                                style={{ 
                                    left: `${(startTime / duration) * 100}%`, 
                                    right: `${100 - (endTime / duration) * 100}%`
                                }}
                            >
                                {/* Drag handles */}
                                <div 
                                    onMouseDown={(e) => { e.stopPropagation(); handleSliderInteract(e, 'start'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); handleSliderInteract(e, 'start'); }}
                                    className="absolute -left-[14px] top-0 bottom-0 w-[14px] pointer-events-auto flex items-center justify-center group-active:scale-110 transition-transform"
                                >
                                    <div className="w-1 h-6 bg-white/60 rounded-full" />
                                </div>
                                <div 
                                    onMouseDown={(e) => { e.stopPropagation(); handleSliderInteract(e, 'end'); }}
                                    onTouchStart={(e) => { e.stopPropagation(); handleSliderInteract(e, 'end'); }}
                                    className="absolute -right-[14px] top-0 bottom-0 w-[14px] pointer-events-auto flex items-center justify-center group-active:scale-110 transition-transform"
                                >
                                    <div className="w-1 h-6 bg-white/60 rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTool === 'filter' && (
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2 px-1 animate-in slide-in-from-right-4">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f)}
                                className={`flex-shrink-0 flex flex-col items-center gap-2 group ${filter.id === f.id ? 'opacity-100' : 'opacity-40'}`}
                            >
                                <div className={`w-14 h-14 rounded-full border-2 transition-all ${filter.id === f.id ? 'border-pink-500 scale-110 ring-4 ring-pink-500/10' : 'border-white/20'}`}>
                                    <div className={`w-full h-full rounded-full bg-zinc-800 ${f.class}`} />
                                </div>
                                <span className="text-[8px] font-black uppercase text-white/60">{f.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {activeTool === 'text' && (
                    <div className="animate-in zoom-in-95 duration-200">
                        <input 
                            type="text"
                            placeholder="Type overlay text..."
                            value={overlayText}
                            onChange={(e) => setOverlayText(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                            autoFocus
                        />
                    </div>
                )}
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
