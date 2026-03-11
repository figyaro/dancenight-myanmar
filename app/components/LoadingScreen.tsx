'use client';

export default function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
    return (
        <div className={`${fullScreen ? 'fixed inset-0 z-[9999]' : 'w-full h-full'} flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500`}>
            <div className="relative flex flex-col items-center">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-pink-500/20 blur-3xl rounded-full scale-150 animate-pulse" />

                {/* Rotating Logo */}
                <div className="relative">
                    <img
                        src="/logoDN.svg"
                        alt="Loading..."
                        className="h-14 w-auto object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-[spin_3s_linear_infinite] opacity-50"
                    />
                </div>

                {/* Subtle text */}
                <p className="mt-6 text-zinc-400 text-[10px] font-black tracking-[0.4em] uppercase animate-pulse">
                    Loading
                </p>
            </div>
        </div>
    );
}
