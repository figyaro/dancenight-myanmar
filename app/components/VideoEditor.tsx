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
                setTimeout(() => reject(new Error('FFmpeg Load Timeout')), 15000)
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
        const count = 8;
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

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const d = videoRef.current.duration;
            setDuration(d);
            setEndTime(Math.min(d, 15));
            generateThumbnails(d);
        }
    };

    const handleProcess = async () => {
        if (!ffmpegLoaded) return;
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

            // Faster encoding settings for mobile
            args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'copy', outputName);

            await ffmpeg.exec(args);

            const data = await ffmpeg.readFile(outputName);
            const editedFile = new File([data as any], `edited_${file.name}`, { type: 'video/mp4' });
            onSave(editedFile);
        } catch (err) {
            console.error('Processing Error:', err);
            alert('Error processing video. Please try a shorter clip.');
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
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center select-none animate-in fade-in duration-300">
            {/* Hidden elements for processing */}
            <video ref={thumbVideoRef} src={videoUrl} hidden crossOrigin="anonymous" />
            <canvas ref={canvasRef} width={160} height={160} hidden />

            {/* Premium Header */}
            <div className="w-full max-w-md flex justify-between items-center px-6 py-8 relative z-50">
                <button 
                    onClick={onCancel} 
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white transition-active border border-white/10"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-0.5">Edit Mode</span>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">{formatTime(endTime - startTime)} selected</h2>
                </div>
                <button 
                    onClick={handleProcess} 
                    disabled={!ffmpegLoaded || isProcessing}
                    className="bg-pink-500 text-white font-black px-6 h-10 rounded-full shadow-[0_4px_20px_rgba(236,72,153,0.4)] disabled:opacity-50 transition-active active:scale-95 text-xs uppercase tracking-widest"
                >
                    {isProcessing ? 'Saving' : 'Next'}
                </button>
            </div>

            {/* Video Canvas Container */}
            <div className="flex-1 w-full max-w-md relative flex items-center justify-center px-4 overflow-hidden">
                <div className="relative aspect-[9/16] w-full max-h-[70vh] rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-zinc-900 border border-white/5 group">
                    <video 
                        ref={videoRef}
                        src={videoUrl} 
                        className={`w-full h-full object-cover transition-all duration-500 ${filter.class}`}
                        onLoadedMetadata={handleLoadedMetadata}
                        playsInline
                        muted
                        loop
                    />
                    
                    {/* Interaction Hint */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Loading Overlay */}
                    {(!ffmpegLoaded || isGeneratingThumbs) && !loadError && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
                            <div className="w-16 h-16 relative">
                                <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full" />
                                <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="mt-6 text-[11px] font-black uppercase tracking-[0.4em] text-pink-500 animate-pulse">Initializing Studio</p>
                        </div>
                    )}

                    {/* Error State */}
                    {loadError && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                                </svg>
                            </div>
                            <h3 className="font-black text-white uppercase tracking-widest mb-2">Editor Offline</h3>
                            <p className="text-zinc-500 text-xs mb-6 px-4 leading-relaxed">{loadError}</p>
                            <button onClick={() => window.location.reload()} className="bg-white text-black font-black px-8 py-3 rounded-full text-[10px] uppercase tracking-[0.2em] transition-active active:scale-95">Restart</button>
                        </div>
                    )}

                    {/* Processing Overlay */}
                    {isProcessing && (
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center space-y-8 animate-in zoom-in duration-500">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full text-zinc-800 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="none" stroke="#ec4899" 
                                        strokeWidth="4" 
                                        strokeDasharray="283" 
                                        strokeDashoffset={283 - (283 * (progress / 100))} 
                                        strokeLinecap="round" 
                                        className="transition-all duration-300 ease-out shadow-[0_0_20px_#ec4899]" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-pink-500 font-black text-3xl">{progress}</span>
                                    <span className="text-[10px] font-black uppercase text-pink-500/50 -mt-1">%</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-white font-black uppercase tracking-[0.3em] text-sm mb-2">Rendering</h3>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Polishing your dance...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Controls Area */}
            <div className="w-full max-w-md px-6 py-6 pb-12 space-y-8 relative">
                <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent pointer-events-none -translate-y-full" />
                
                {/* Trimmer UI: Luxury Filmstrip */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end px-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Filmstrip</label>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_#ec4899]" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Live Preview</span>
                        </div>
                    </div>
                    
                    <div className="relative h-20 bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden ring-1 ring-white/10 group/filmstrip">
                        {/* Filmstrip Background */}
                        <div className="absolute inset-0 flex gap-0.5 p-1">
                            {thumbnails.length > 0 ? (
                                thumbnails.map((src, i) => (
                                    <img key={i} src={src} className="flex-1 h-full object-cover rounded shadow-inner opacity-60 grayscale-[0.5] group-hover/filmstrip:grayscale-0 transition-all duration-500" alt="" />
                                ))
                            ) : (
                                Array(8).fill(0).map((_, i) => (
                                    <div key={i} className="flex-1 h-full bg-zinc-800/40 rounded animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                                ))
                            )}
                        </div>

                        {/* Custom Luxury Dual Slider */}
                        <div className="absolute inset-0 px-2 flex items-center">
                            <div className="relative w-full h-full flex items-center">
                                {/* Range Indicator Overlay */}
                                <div 
                                    className="absolute h-[calc(100%-8px)] border-y-4 border-pink-500 bg-pink-500/10 backdrop-blur-[2px] z-10 box-border rounded-[2px]"
                                    style={{ 
                                        left: `${(startTime / duration) * 100}%`, 
                                        right: `${100 - (endTime / duration) * 100}%`
                                    }}
                                >
                                    {/* Handles */}
                                    <div className="absolute -left-2 top-0 bottom-0 w-4 bg-pink-500 rounded-l cursor-ew-resize flex items-center justify-center shadow-lg">
                                        <div className="w-0.5 h-6 bg-white/40 rounded-full" />
                                    </div>
                                    <div className="absolute -right-2 top-0 bottom-0 w-4 bg-pink-500 rounded-r cursor-ew-resize flex items-center justify-center shadow-lg">
                                        <div className="w-0.5 h-6 bg-white/40 rounded-full" />
                                    </div>
                                </div>
                                
                                {/* Transparent Inputs for interaction */}
                                <input 
                                    type="range" min={0} max={duration} step={0.1} value={startTime}
                                    onChange={(e) => {
                                        const val = Math.min(parseFloat(e.target.value), endTime - 0.5);
                                        setStartTime(val);
                                        if (videoRef.current) videoRef.current.currentTime = val;
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-auto"
                                />
                                <input 
                                    type="range" min={0} max={duration} step={0.1} value={endTime}
                                    onChange={(e) => {
                                        const val = Math.max(parseFloat(e.target.value), startTime + 0.5);
                                        setEndTime(val);
                                        if (videoRef.current) videoRef.current.currentTime = val;
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 pointer-events-auto"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Filter Carousel */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Filters</label>
                    <div className="flex gap-5 overflow-x-auto pb-4 px-1 scrollbar-hide snap-x">
                        {FILTERS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f)}
                                className="flex-shrink-0 flex flex-col items-center gap-3 transition-active snap-center"
                            >
                                <div className={`relative w-16 h-16 rounded-full border-2 transition-all duration-300 ${filter.id === f.id ? 'border-pink-500 scale-110 shadow-[0_0_15px_#ec489955]' : 'border-white/10 grayscale-[0.5]'}`}>
                                    <div className={`w-full h-full rounded-full bg-zinc-800 overflow-hidden ${f.class}`}>
                                        {thumbnails[0] ? (
                                            <img src={thumbnails[0]} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                                        )}
                                    </div>
                                    {filter.id === f.id && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-black">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                                                <path d="M20 6L9 17l-5-5" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${filter.id === f.id ? 'text-white' : 'text-zinc-500'}`}>{f.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .transition-active:active { transform: scale(0.95); }
                input[type=range]::-webkit-slider-thumb {
                    pointer-events: auto;
                    width: 20px;
                    height: 80px;
                    appearance: none;
                }
            `}</style>
        </div>
    );
}
