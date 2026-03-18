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
    
    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef<HTMLVideoElement>(null);
    const thumbVideoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [activeHandle, setActiveHandle] = useState<'start' | 'end'>('start');

    // Load FFmpeg and Generate Thumbnails
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
            
            ffmpeg.on('log', ({ message }) => console.log('FFmpeg Log:', message));
            ffmpeg.on('progress', ({ progress }) => setProgress(Math.round(progress * 100)));

            // Add a timeout for loading
            const loadPromise = ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('FFmpeg Load Timeout')), 20000)
            );

            await Promise.race([loadPromise, timeoutPromise]);
            setFfmpegLoaded(true);
        } catch (err: any) {
            console.error('FFmpeg Load Error:', err);
            setLoadError('Failed to initialize editor. Please try again.');
        }
    };

    const generateThumbnails = useCallback(async (vidDuration: number) => {
        if (!vidDuration) return;
        setIsGeneratingThumbs(true);
        const thumbs: string[] = [];
        const count = 10; // Increased count for better filmstrip
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
                    // Maintain aspect ratio for thumbnails
                    const ratio = vid.videoWidth / vid.videoHeight;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                } else {
                    resolve(null);
                }
                vid.removeEventListener('seeked', onSeeked);
            };
            vid.addEventListener('seeked', onSeeked);
        });
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const d = videoRef.current.duration;
            setDuration(d);
            setEndTime(Math.min(d, 15));
            generateThumbnails(d);
        }
    };

    const handleProcess = async () => {
        if (!ffmpegLoaded) {
            // Fallback: If FFmpeg is not loaded, just save the original file
            console.warn('FFmpeg not loaded, saving original file.');
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
            
            if (filter.id !== 'none' && filter.ffmpeg) {
                args.push('-vf', filter.ffmpeg);
            }

            // High quality output
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'copy', outputName);

            await ffmpeg.exec(args);

            const data = await ffmpeg.readFile(outputName);
            const editedFile = new File([data as any], `edited_${file.name}`, { type: 'video/mp4' });
            onSave(editedFile);
        } catch (err) {
            console.error('Processing Error:', err);
            // On error, still allow user to proceed with original
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center select-none animate-in fade-in duration-300 font-sans">
            {/* Hidden components */}
            <video ref={thumbVideoRef} src={videoUrl} hidden crossOrigin="anonymous" />
            <canvas ref={canvasRef} width={240} height={240} hidden />

            {/* Header: Dynamic blurring glassmorphism */}
            <div className="w-full max-w-lg flex justify-between items-center px-6 pt-10 pb-6 relative z-50">
                <button 
                    onClick={onCancel} 
                    className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/10 active:scale-90"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">Editor Pro</span>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">{formatTime(endTime - startTime)} Segment</h2>
                    </div>
                </div>
                <button 
                    onClick={handleProcess} 
                    disabled={isProcessing}
                    className="bg-white text-black font-black px-8 h-12 rounded-2xl shadow-[0_8px_30px_rgba(255,255,255,0.1)] disabled:opacity-30 transition-all active:scale-95 text-[11px] uppercase tracking-[0.2em]"
                >
                    {isProcessing ? 'Saving' : 'Next'}
                </button>
            </div>

            {/* Video Stage: Intelligent Layout for 100% Visibility */}
            <div className="flex-1 w-full max-w-lg relative flex items-center justify-center px-4 overflow-hidden py-4">
                {/* Background Blur for non-standard aspect ratios */}
                <div 
                    className="absolute inset-x-8 inset-y-12 opacity-30 blur-3xl pointer-events-none transition-all duration-1000"
                    style={{ background: filter.class ? 'inherit' : 'linear-gradient(45deg, #ec4899, #8b5cf6)' }}
                />

                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-zinc-950 border border-white/10 group flex items-center justify-center">
                    <video 
                        ref={videoRef}
                        src={videoUrl} 
                        className={`w-full h-full object-contain transition-all duration-500 transform-gpu ${filter.class}`}
                        onLoadedMetadata={handleLoadedMetadata}
                        playsInline
                        muted
                        loop
                    />
                    
                    {/* Centered Loading Progress (FFmpeg Initialization) */}
                    {(!ffmpegLoaded || isGeneratingThumbs) && !loadError && (
                        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center space-y-8 z-[60] animate-in fade-in duration-500">
                            <div className="relative w-40 h-40">
                                <svg className="w-full h-full text-zinc-900 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" />
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" stroke="#ec4899" 
                                        strokeWidth="4" 
                                        strokeDasharray="283" 
                                        strokeDashoffset={283 - (283 * (progress / 100))} 
                                        strokeLinecap="round" 
                                        className="transition-all duration-500 ease-out shadow-[0_0_30px_#ec4899]" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-white font-black text-5xl tracking-tighter">{progress}</span>
                                    <span className="text-[10px] font-black uppercase text-pink-500 tracking-[0.5em] mt-1">Percent</span>
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-white font-black uppercase tracking-[0.4em] text-sm">Syncing Studio</h3>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Initializing native components...</p>
                            </div>
                        </div>
                    )}

                    {/* Rendering Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center space-y-10 z-[70] animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 relative">
                                <div className="absolute inset-0 border-[6px] border-pink-500/10 rounded-full" />
                                <div className="absolute inset-0 border-[6px] border-pink-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#ec4899]" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-pink-500 font-black text-xl">{progress}%</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-white font-black uppercase tracking-[0.3em] text-lg mb-2">Exporting</h3>
                                <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">Applying filters and trimming frames...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls Section */}
            <div className="w-full max-w-lg px-8 py-8 pb-16 space-y-10 relative">
                {/* Trimmer: Advanced Dual-Slider with z-index correction */}
                <div className="space-y-5">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Timeline</label>
                            <span className="text-[11px] font-bold text-white/90 uppercase tabular-nums">{formatTime(startTime)} — {formatTime(endTime)}</span>
                        </div>
                        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10">
                             <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{formatTime(endTime - startTime)} Total</span>
                        </div>
                    </div>
                    
                    <div className="relative h-24 bg-white/[0.02] rounded-3xl border border-white/10 overflow-hidden ring-1 ring-white/10 group/filmstrip shadow-2xl">
                        {/* Filmstrip Tracks */}
                        <div className="absolute inset-0 flex gap-1 p-1.5 opacity-40 group-hover/filmstrip:opacity-100 transition-opacity duration-700">
                            {thumbnails.length > 0 ? (
                                thumbnails.map((src, i) => (
                                    <div key={i} className="flex-1 h-full overflow-hidden rounded-md border border-white/5">
                                        <img src={src} className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all duration-300" alt="" />
                                    </div>
                                ))
                            ) : (
                                Array(10).fill(0).map((_, i) => (
                                    <div key={i} className="flex-1 h-full bg-white/5 rounded-md animate-pulse" />
                                ))
                            )}
                        </div>

                        {/* Custom Luxury Dual Trimmer */}
                        <div className="absolute inset-0 px-2 flex items-center">
                            <div className="relative w-full h-[calc(100%-12px)] flex items-center">
                                {/* Highlight Area */}
                                <div 
                                    className="absolute h-full border-x-[12px] border-y-4 border-pink-500 bg-pink-500/10 backdrop-blur-[4px] z-10 rounded-xl"
                                    style={{ 
                                        left: `${(startTime / duration) * 100}%`, 
                                        right: `${100 - (endTime / duration) * 100}%`
                                    }}
                                >
                                    {/* Left Handle Cap */}
                                    <div className="absolute -left-[12px] top-0 bottom-0 w-[12px] flex items-center justify-center pointer-events-none">
                                        <div className="w-1 h-8 bg-white/60 rounded-full" />
                                    </div>
                                    {/* Right Handle Cap */}
                                    <div className="absolute -right-[12px] top-0 bottom-0 w-[12px] flex items-center justify-center pointer-events-none">
                                        <div className="w-1 h-8 bg-white/60 rounded-full" />
                                    </div>
                                </div>
                                
                                {/* INTERACTIVE SLIDERS: z-index swap logic allows both handles to be grabbed when overlapping */}
                                <input 
                                    type="range" min={0} max={duration} step={0.1} value={startTime}
                                    onMouseDown={() => setActiveHandle('start')}
                                    onTouchStart={() => setActiveHandle('start')}
                                    onChange={(e) => {
                                        const val = Math.min(parseFloat(e.target.value), endTime - 0.5);
                                        setStartTime(val);
                                        if (videoRef.current) videoRef.current.currentTime = val;
                                    }}
                                    className={`absolute inset-0 w-full h-full opacity-0 cursor-ew-resize pointer-events-auto ${activeHandle === 'start' ? 'z-30' : 'z-20'}`}
                                />
                                <input 
                                    type="range" min={0} max={duration} step={0.1} value={endTime}
                                    onMouseDown={() => setActiveHandle('end')}
                                    onTouchStart={() => setActiveHandle('end')}
                                    onChange={(e) => {
                                        const val = Math.max(parseFloat(e.target.value), startTime + 0.5);
                                        setEndTime(val);
                                        if (videoRef.current) videoRef.current.currentTime = val;
                                    }}
                                    className={`absolute inset-0 w-full h-full opacity-0 cursor-ew-resize pointer-events-auto ${activeHandle === 'end' ? 'z-30' : 'z-20'}`}
                                />
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-600 text-center uppercase tracking-[0.2em] font-black">Hold and drag to select your peak performance</p>
                </div>

                {/* Filter Suite */}
                <div className="space-y-5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-1">Visual Styles</label>
                    <div className="flex gap-6 overflow-x-auto pb-4 px-1 scrollbar-hide snap-x">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f)}
                                className="flex-shrink-0 flex flex-col items-center gap-4 transition-all active:scale-90 snap-center"
                            >
                                <div className={`relative w-20 h-20 rounded-[1.8rem] border-2 transition-all duration-500 overflow-hidden ${filter.id === f.id ? 'border-pink-500 ring-4 ring-pink-500/20' : 'border-white/5 grayscale-[0.6] opacity-60'}`}>
                                    <div className={`w-full h-full scale-110 ${f.class}`}>
                                        {thumbnails[0] ? (
                                            <img src={thumbnails[0]} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-900" />
                                        )}
                                    </div>
                                    {filter.id === f.id && (
                                        <div className="absolute inset-0 bg-pink-500/10 flex items-center justify-center backdrop-blur-[2px]">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-xl">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4">
                                                    <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${filter.id === f.id ? 'text-white' : 'text-zinc-500'}`}>{f.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                input[type=range]::-webkit-slider-thumb {
                    pointer-events: auto;
                    width: 40px;
                    height: 100px;
                    appearance: none;
                }
                .transform-gpu { transform: translateZ(0); }
            `}</style>
        </div>
    );
}
