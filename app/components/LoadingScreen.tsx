'use client';

export default function LoadingScreen({ fullScreen = true }: { fullScreen?: boolean }) {
    return (
        <div className={`${fullScreen ? 'fixed inset-0 z-[9999]' : 'w-full h-full'} flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-in fade-in duration-700`}>
            <div className="relative flex flex-col items-center">
                {/* Rotating Logo - Slightly Dim */}
                <div className="relative">
                    <img
                        src="/logoDN.svg"
                        alt="Loading..."
                        className="h-16 w-auto object-contain opacity-20 grayscale brightness-200 animate-[spin_4s_linear_infinite]"
                    />
                </div>

                {/* Subtle text */}
                <p className="mt-8 text-white/20 text-[8px] font-black tracking-[0.5em] uppercase">
                    Loading
                </p>
            </div>
        </div>
    );
}
