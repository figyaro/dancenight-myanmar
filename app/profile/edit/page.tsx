'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { getEffectiveUserId } from '../../../lib/auth-util';

export default function EditProfile() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        nickname: '',
        short_bio: '',
        mind_icon: '',
        bio: '',
        birth_date: '',
        gender: '',
        nationality: '',
        language: '',
        phone: '',
        avatar_url: ''
    });

    // --- Crop State ---
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    // Client-side image compression & cropping (Max 400x400px JPEG)
    const handleCropComplete = async () => {
        if (!imageRef.current || !cropImageSrc) return;

        setSaving(true);
        try {
            const canvas = document.createElement('canvas');
            const CROP_SIZE = 400; // 最終的な切り抜きサイズ(正方形)
            canvas.width = CROP_SIZE;
            canvas.height = CROP_SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not found');

            const img = imageRef.current;
            // コンテナ(画面の横幅から計算されるクロップエリア)のサイズ
            const containerSize = window.innerWidth - 32; // px-4 (16px * 2) を考慮

            // 実際の画像の元サイズと、表示されているサイズの比率
            const displayWidth = img.width * cropZoom;
            const displayHeight = img.height * cropZoom;

            const scaleX = img.naturalWidth / displayWidth;
            const scaleY = img.naturalHeight / displayHeight;

            // クロップ枠の左上座標 (コンテナ中央から cropOffset を引いたもの)
            const sourceX = ((displayWidth - containerSize) / 2 - cropOffset.x) * scaleX;
            const sourceY = ((displayHeight - containerSize) / 2 - cropOffset.y) * scaleY;
            const sourceWidth = containerSize * scaleX;
            const sourceHeight = containerSize * scaleY;

            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, CROP_SIZE, CROP_SIZE);

            canvas.toBlob(async (blob) => {
                try {
                    if (!blob) throw new Error('Blob creation failed');

                    const userId = await getEffectiveUserId();
                    if (!userId) throw new Error('Login session expired. Please log in again.');

                    const newFile = new File([blob], `${userId}-${Date.now()}.jpeg`, { type: 'image/jpeg' });

                    const { uploadMedia } = await import('../../../lib/media-upload');
                    const { url, error } = await uploadMedia(newFile, 'avatars');

                    if (error) {
                        console.error('Upload Error:', error);
                        throw new Error(`Upload failed: ${error}`);
                    }

                    setFormData(prev => ({ ...prev, avatar_url: url }));
                    setCropImageSrc(null); // クロップモーダルを閉じる
                } catch (innerError: any) {
                    console.error('Crop inner error:', innerError);
                    alert(innerError.message);
                } finally {
                    setSaving(false);
                }
            }, 'image/jpeg', 0.85);

        } catch (error: any) {
            console.error('Crop outer error:', error);
            alert('Failed to prepare image: ' + error.message);
            setSaving(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setCropZoom(1);
            setCropOffset({ x: 0, y: 0 });
        };
        reader.readAsDataURL(file);

        // Reset input field
        e.target.value = '';
    };

    // --- Drag Logic ---
    const startDrag = (e: any) => {
        setIsDragging(true);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - cropOffset.x, y: clientY - cropOffset.y });
    };

    const onDrag = (e: any) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        setCropOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
    };

    const endDrag = () => setIsDragging(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userId = await getEffectiveUserId();
                if (!userId) {
                    router.push('/login');
                    return;
                }

                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                if (data) {
                    setFormData({
                        nickname: data.nickname || data.name || '',
                        short_bio: data.short_bio || '',
                        mind_icon: data.mind_icon || '',
                        bio: data.bio || '',
                        birth_date: data.birth_date ? data.birth_date.split('T')[0] : '', // Format for date input
                        gender: data.gender || '',
                        nationality: data.nationality || '',
                        language: data.language || '',
                        phone: data.phone || '',
                        avatar_url: data.avatar_url || ''
                    });
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
        const userId = await getEffectiveUserId();
        if (!userId) return;

            const { data, error } = await supabase
                .from('users')
                .update({
                    nickname: formData.nickname,
                    short_bio: formData.short_bio,
                    mind_icon: formData.mind_icon,
                    bio: formData.bio,
                    birth_date: formData.birth_date || null,
                    gender: formData.gender,
                    nationality: formData.nationality,
                    language: formData.language,
                    phone: formData.phone,
                    avatar_url: formData.avatar_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select();

            console.log('Update result:', { data, error });

            if (error) throw error;

            // If 0 items, likely blocked by RLS
            if (!data || data.length === 0) {
                throw new Error('No permission to update. (Please check RLS settings)');
            }

            router.refresh(); // Reset Next.js router cache to ensure latest data
            router.push('/profile');
        } catch (err: any) {
            console.error('Error updating profile:', err);
            alert('Failed to update profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen text-white">
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800">
                <div className="max-w-md mx-auto flex items-center justify-between px-4 py-4">
                    <Link href="/profile" className="text-pink-500 font-medium">
                        Cancel
                    </Link>
                    <h1 className="text-lg font-bold">Edit Profile</h1>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className={`font-bold ${saving ? 'text-zinc-500' : 'text-pink-500'}`}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </header>

            <main className="pt-20 pb-10 px-4 max-w-md mx-auto">
                <form className="space-y-6">
                    {/* Avatar Image */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Profile Image</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0">
                                {formData.avatar_url ? (
                                    <img src={formData.avatar_url} alt="Avatar Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors">
                                Select Image (Crop)
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={saving}
                                />
                            </label>
                            {saving && <span className="text-pink-500 text-sm animate-pulse">Saving...</span>}
                        </div>
                    </div>

                    {/* Nickname */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nickname</label>
                        <input
                            type="text"
                            name="nickname"
                            value={formData.nickname}
                            onChange={handleChange}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                        />
                    </div>

                    {/* Short Bio */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Short Bio</label>
                        <input
                            type="text"
                            name="short_bio"
                            value={formData.short_bio}
                            onChange={handleChange}
                            placeholder="Nice to meet you!"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                        />
                    </div>

                    {/* Mind Icon */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Current Mindset</label>
                        <div className="grid grid-cols-5 gap-2">
                            {['😁', '😆', '😍', '😎', '😜', '😢', '😭', '😡', '😴', '🥂', '🎤', '💃', '🕺', '🔥', '✨'].map(icon => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, mind_icon: icon })}
                                    className={`text-2xl py-2 rounded-lg border ${formData.mind_icon === icon ? 'bg-pink-500/20 border-pink-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'} transition-all`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 mt-2">Select an icon that reflects your mood</p>
                    </div>

                    {/* Basic Info */}
                    <div className="pt-4 border-t border-zinc-800">
                        <h3 className="font-bold text-zinc-300 mb-4">Basic Information</h3>

                        <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Birth Date</label>
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value={formData.birth_date}
                                        onChange={handleChange}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 [color-scheme:dark]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="0912345678"
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nationality</label>
                                    <select
                                        name="nationality"
                                        value={formData.nationality}
                                        onChange={handleChange}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Myanmar">Myanmar</option>
                                        <option value="Japan">Japan</option>
                                        <option value="Korea">Korea</option>
                                        <option value="China">China</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Language Setting</label>
                                    <select
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="Myanmar">Myanmar</option>
                                        <option value="Japanese">Japanese</option>
                                        <option value="English">English</option>
                                        <option value="Chinese">Chinese</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="pt-4 border-t border-zinc-800">
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Bio</label>
                        <textarea
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            rows={5}
                            placeholder="Write something about yourself..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 resize-none"
                        ></textarea>
                    </div>
                </form>
            </main>

            {/* --- クロップモーダル --- */}
            {cropImageSrc && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overscroll-none touch-none">
                    <div className="w-full flex justify-between items-center p-4 absolute top-0 left-0 bg-black/50 z-[101]">
                        <button onClick={() => setCropImageSrc(null)} className="text-white font-bold p-2">Cancel</button>
                        <button onClick={handleCropComplete} disabled={saving} className="text-pink-500 font-bold p-2">
                            {saving ? 'Saving...' : 'Done'}
                        </button>
                    </div>

                    {/* クロップ用コンテナ: 画面幅いっぱいから少し余白を取った正方形 */}
                    <div
                        className="relative overflow-hidden w-[calc(100vw-32px)] h-[calc(100vw-32px)] border-2 border-pink-500 rounded-lg cursor-move bg-zinc-900"
                        onMouseDown={startDrag}
                        onMouseMove={onDrag}
                        onMouseUp={endDrag}
                        onMouseLeave={endDrag}
                        onTouchStart={startDrag}
                        onTouchMove={onDrag}
                        onTouchEnd={endDrag}
                    >
                        <img
                            ref={imageRef}
                            src={cropImageSrc}
                            style={{
                                transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropZoom})`,
                                left: '50%',
                                top: '50%',
                                transformOrigin: 'center',
                                position: 'absolute',
                                maxWidth: 'none',
                                userSelect: 'none',
                                pointerEvents: 'none'
                            }}
                            alt="Crop Preview"
                            draggable="false"
                        />
                        {/* Grid Guide */}
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                            <div className="border border-white/20"></div><div className="border border-white/20"></div><div className="border border-white/20"></div>
                            <div className="border border-white/20"></div><div className="border border-white/20"></div><div className="border border-white/20"></div>
                            <div className="border border-white/20"></div><div className="border border-white/20"></div><div className="border border-white/20"></div>
                        </div>
                    </div>

                    {/* ズームスライダー */}
                    <div className="absolute bottom-10 w-full px-8 flex items-center gap-4">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.05"
                            value={cropZoom}
                            onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                            className="w-full accent-pink-500"
                        />
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white shrink-0">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}
