'use client';

import { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface VideoEditorProps {
    file: File;
    onSave: (editedFile: File) => void;
    onCancel: () => void;
}

export default function VideoEditor({ file, onSave, onCancel }: VideoEditorProps) {
    const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [filter, setFilter] = useState<string>('none');
    
    const ffmpegRef = useRef(new FFmpeg());
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setVideoUrl(URL.createObjectURL(file));
        loadFfmpeg();
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [file]);

    const loadFfmpeg = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpeg = ffmpegRef.current;
        
        ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });
        
        ffmpeg.on('progress', ({ progress }) => {
            setProgress(Math.round(progress * 100));
        });

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        setFfmpegLoaded(true);
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const d = videoRef.current.duration;
            setDuration(d);
            setEndTime(Math.min(d, 15)); // Default to 15s or max duration
        }
    };

    const handleProcess = async () => {
        if (!ffmpegLoaded) return;
        setIsProcessing(true);
        const ffmpeg = ffmpegRef.current;
        
        const inputName = 'input.mp4';
        const outputName = 'output.mp4';

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // Build FFmpeg command
        const args = ['-ss', startTime.toString(), '-to', endTime.toString(), '-i', inputName];
        
        // Add filters
        if (filter === 'grayscale') {
            args.push('-vf', 'format=gray');
        } else if (filter === 'sepia') {
            args.push('-vf', 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
        } else if (filter === 'vintage') {
            args.push('-vf', 'curves=vintage');
        }

        args.push(outputName);

        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile(outputName);
        const editedFile = new File([data as any], file.name, { type: 'video/mp4' });
        
        setIsProcessing(false);
        onSave(editedFile);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-between p-4 pb-12 animate-in fade-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-4">
                <button onClick={onCancel} className="text-zinc-400 font-bold px-4 py-2">Cancel</button>
                <h2 className="text-lg font-black tracking-widest uppercase">Edit Video</h2>
                <button 
                    onClick={handleProcess} 
                    disabled={!ffmpegLoaded || isProcessing}
                    className="bg-pink-500 text-white font-black px-6 py-2 rounded-full disabled:opacity-50"
                >
                    {isProcessing ? 'Processing...' : 'Done'}
                </button>
            </div>

            {/* Video Preview */}
            <div className="relative flex-1 w-full max-w-md bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
                <video 
                    ref={videoRef}
                    src={videoUrl} 
                    className={`w-full h-full object-contain ${filter === 'grayscale' ? 'grayscale' : filter === 'sepia' ? 'sepia' : ''}`}
                    onLoadedMetadata={handleLoadedMetadata}
                    playsInline
                    muted
                    loop
                />
                
                {!ffmpegLoaded && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center space-y-4">
                        <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Loading Editor...</p>
                    </div>
                )}

                {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-6">
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full text-zinc-800 -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" />
                                <circle 
                                    cx="50" cy="50" r="45" 
                                    fill="none" stroke="#ec4899" 
                                    strokeWidth="6" 
                                    strokeDasharray="283" 
                                    strokeDashoffset={283 - (283 * (progress / 100))} 
                                    strokeLinecap="round" 
                                    className="transition-all duration-300 ease-out" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-pink-500 font-black text-xl">{progress}%</span>
                            </div>
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest text-white">Applying Changes...</p>
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="w-full max-w-md mt-6 space-y-8 px-2">
                {/* Trimming UI */}
                <div className="space-y-4">
                    <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        <span>Range: {formatTime(startTime)} - {formatTime(endTime)}</span>
                        <span className="text-pink-500">Duration: {formatTime(endTime - startTime)}</span>
                    </div>
                    
                    <div className="relative h-12 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center px-4">
                        <div className="w-full space-y-4">
                            <input 
                                type="range" 
                                min={0} 
                                max={duration} 
                                step={0.1}
                                value={startTime}
                                onChange={(e) => {
                                    const val = Math.min(parseFloat(e.target.value), endTime - 0.5);
                                    setStartTime(val);
                                    if (videoRef.current) videoRef.current.currentTime = val;
                                }}
                                className="absolute left-0 right-0 w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                            <input 
                                type="range" 
                                min={0} 
                                max={duration} 
                                step={0.1}
                                value={endTime}
                                onChange={(e) => {
                                    const val = Math.max(parseFloat(e.target.value), startTime + 0.5);
                                    setEndTime(val);
                                    if (videoRef.current) videoRef.current.currentTime = val;
                                }}
                                className="absolute left-0 right-0 w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500 mt-4"
                            />
                        </div>
                    </div>
                    <p className="text-[9px] text-zinc-600 text-center uppercase tracking-widest">Drag sliders to trim. Max 15 seconds recommended.</p>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                    <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Filters</span>
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {['none', 'grayscale', 'sepia', 'vintage'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-shrink-0 w-20 aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center bg-zinc-900 ${filter === f ? 'border-pink-500 bg-pink-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}
                            >
                                <div className={`w-8 h-8 rounded-full bg-zinc-800 mb-2 ${f === 'grayscale' ? 'grayscale' : f === 'sepia' ? 'sepia' : ''}`} />
                                <span className="text-[8px] font-black uppercase tracking-widest">{f}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
