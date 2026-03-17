'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';
import { trackAnalyticsEvent } from '../../../lib/analytics';
import LoadingScreen from '../../components/LoadingScreen';
import BottomNav from '../../components/BottomNav';
import { SNSLogos } from '../../components/SNSLogos';
import { isBunnyStream, getBunnyStreamVideoUrl } from '../../../lib/bunny';

interface Room {
    id: string;
    name: string;
    capacity: number;
    price_per_hour: number;
    description: string;
    image_url: string;
    main_image_url?: string; // Add optional fallback
    status: string;
    tags: string[];
}

interface Reservation {
    start_time: string;
    end_time: string;
}

/**
 * Transforms various Google Maps URL formats (share links, place links) 
 * into a URL suitable for <iframe> embedding.
 */
function getMapEmbedUrl(url: string | null, shopName: string, area: string) {
    if (!url) {
        // Fallback: search by name + area if no specific URL is provided
        const query = encodeURIComponent(`${shopName} ${area}`);
        return `https://maps.google.com/maps?q=${query}&hl=en&z=15&output=embed&iwloc=`;
    }

    // 1. If it's already an embed URL (contains /embed), return as-is
    if (url.includes('/embed') || (url.includes('google.com/maps') && url.includes('output=embed'))) {
        return url;
    }

    // 2. Handle maps.app.goo.gl (short links) or direct place links with Lat/Lng
    const latLngMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (latLngMatch) {
        const lat = latLngMatch[1];
        const lng = latLngMatch[2];
        return `https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed&iwloc=`;
    }

    // 3. Check if it's a plain address/search query
    // If it contains http, it's likely a URL. If not, treat as text query.
    if (!url.includes('http')) {
        const query = encodeURIComponent(url);
        return `https://maps.google.com/maps?q=${query}&hl=en&z=15&output=embed&iwloc=`;
    }

    // Default Fallback for generic URLs or short links
    const query = encodeURIComponent(`${shopName} ${area}`);
    return `https://maps.google.com/maps?q=${query}&hl=en&z=15&output=embed&iwloc=`;
}

export default function ShopDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [shop, setShop] = useState<any>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [shopPosts, setShopPosts] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [averageRating, setAverageRating] = useState(0);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [userRating, setUserRating] = useState(5);
    const [userComment, setUserComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    
    // Booking Form State
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('19:00');
    const [endTime, setEndTime] = useState('21:00');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [existingReservations, setExistingReservations] = useState<Reservation[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userWallet, setUserWallet] = useState<any>(null);
    const [isMapExpanded, setIsMapExpanded] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'dtip'>('cash');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch User & Language using getSession for stability
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user || null;
                
                if (user) {
                    setCurrentUser(user);
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', user.id)
                        .single();
                    if (userData?.language) setLanguage(userData.language);

                    // Fetch User Wallet
                    const { data: walletData } = await supabase
                        .from('wallets')
                        .select('*')
                        .eq('user_id', user.id)
                        .single();
                    if (walletData) setUserWallet(walletData);
                }

                // Fetch Shop Details
                const { data: shopData, error: shopError } = await supabase
                    .from('shops')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (shopError) throw shopError;
                setShop(shopData);

                // Fetch Rooms
                const { data: roomData, error: roomError } = await supabase
                    .from('shop_rooms')
                    .select('*')
                    .eq('shop_id', id)
                    .eq('status', 'available');
                
                if (roomError) throw roomError;
                setRooms(roomData || []);

                // Fetch Shop Posts
                const { data: postsData } = await supabase
                    .from('posts')
                    .select('*')
                    .eq('shop_id', id)
                    .order('created_at', { ascending: false });
                setShopPosts(postsData || []);

                // Fetch Shop Events
                const { data: eventsData } = await supabase
                    .from('events')
                    .select('*')
                    .eq('shop_id', id)
                    .eq('status', 'published')
                    .order('date', { ascending: true });
                setEvents(eventsData || []);

                // Fetch Reviews
                const { data: reviewsData } = await supabase
                    .from('reviews')
                    .select('*, user:users(nickname, avatar_url)')
                    .eq('shop_id', id as string)
                    .order('created_at', { ascending: false });
                
                if (reviewsData) {
                    setReviews(reviewsData);
                    const avg = reviewsData.reduce((acc, curr) => acc + curr.rating, 0) / reviewsData.length;
                    setAverageRating(Number(avg.toFixed(1)) || 0);
                }

                // Track Shop Impression
                trackAnalyticsEvent({ shopId: id as string, eventType: 'shop_impression' });

            } catch (err: any) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const fetchReservations = async (roomId: string, date: string) => {
        const startOfDay = `${date}T00:00:00Z`;
        const endOfDay = `${date}T23:59:59Z`;
        
        const { data, error } = await supabase
            .from('room_reservations')
            .select('start_time, end_time')
            .eq('room_id', roomId)
            .neq('status', 'cancelled')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay);
        
        if (!error && data) {
            setExistingReservations(data);
        }
    };

    const handleRoomSelect = (room: Room) => {
        setSelectedRoom(room);
        setIsBookingModalOpen(true);
        fetchReservations(room.id, bookingDate);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setBookingDate(newDate);
        if (selectedRoom) {
            fetchReservations(selectedRoom.id, newDate);
        }
    };

    const isSlotAvailable = (start: string, end: string) => {
        const reqStart = new Date(`${bookingDate}T${start}:00Z`).getTime();
        const reqEnd = new Date(`${bookingDate}T${end}:00Z`).getTime();

        return !existingReservations.some(res => {
            const resStart = new Date(res.start_time).getTime();
            const resEnd = new Date(res.end_time).getTime();
            return (reqStart < resEnd && reqEnd > resStart);
        });
    };

    const isVideo = (url: string | null) => {
        if (!url) return false;
        return url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) !== null || isBunnyStream(url);
    };

    const handleBookingSubmit = async () => {
        if (!currentUser) {
            alert('Please login to make a reservation.');
            return;
        }

        const durationHours = 2; // Fixed for now based on UI
        const totalPrice = (selectedRoom?.price_per_hour || 0) * durationHours;
        const dtipRequired = Math.ceil(totalPrice / 1000); // 1 dtip = 1000 MMK

        if (paymentMethod === 'dtip') {
            if (!userWallet || userWallet.balance < dtipRequired) {
                alert(`Insufficient dtip balance. You need ${dtipRequired} dtip.`);
                return;
            }
        }

        if (!isSlotAvailable(startTime, endTime)) {
            alert('This time slot is already booked. Please choose another time.');
            return;
        }

        setIsSubmitting(true);
        try {
            const startDateTime = `${bookingDate}T${startTime}:00Z`;
            const endDateTime = `${bookingDate}T${endTime}:00Z`;

            // If dtip selected, process transaction first
            if (paymentMethod === 'dtip') {
                const { data: txSuccess, error: txError } = await supabase.rpc('process_dtip_transaction', {
                    p_sender_id: currentUser.id,
                    p_receiver_id: null, // To system/shop
                    p_amount: dtipRequired,
                    p_transaction_type: 'payment',
                    p_reference_type: 'reservation'
                });

                if (txError || !txSuccess) throw new Error(txError?.message || 'dtip payment failed');
            }

            const { data: reservation, error: resError } = await supabase
                .from('room_reservations')
                .insert([{
                    room_id: selectedRoom?.id,
                    user_id: currentUser.id,
                    start_time: startDateTime,
                    end_time: endDateTime,
                    status: 'pending'
                }])
                .select()
                .single();

            if (resError) throw resError;

            // 1. Find Shop Owner/Admin to send message and notification to
            const { data: shopMembers, error: memberError } = await supabase
                .from('shop_members')
                .select('user_id')
                .eq('shop_id', id)
                .order('role', { ascending: false }) // Try to get owner first
                .limit(1);

            const shopContactId = shopMembers?.[0]?.user_id;

            if (shopContactId) {
                // 2. Automated Chat Message
                // Find or Create Conversation
                let { data: conversation } = await supabase
                    .from('conversations')
                    .select('id')
                    .contains('participants', [currentUser.id, shopContactId])
                    .maybeSingle();
                
                if (!conversation) {
                    const { data: newConv, error: convError } = await supabase
                        .from('conversations')
                        .insert([{
                            name: `${shop.name} Chat`,
                            participants: [currentUser.id, shopContactId]
                        }])
                        .select()
                        .single();
                    if (!convError) conversation = newConv;
                }

                if (conversation) {
                    await supabase.from('messages').insert([{
                        conversation_id: conversation.id,
                        sender_id: shopContactId, // As if the shop replied automatically
                        text: `Thank you for your reservation! Your booking for ${selectedRoom?.name} on ${bookingDate} from ${startTime} to ${endTime} is being processed.`
                    }]);
                }

                // 3. Admin Notification (Push/Email Trigger)
                await supabase.from('notifications').insert([{
                    user_id: shopContactId,
                    title: 'New Room Reservation',
                    message: `${currentUser.user_metadata?.full_name || currentUser.email || 'A customer'} has requested to book ${selectedRoom?.name} for ${bookingDate}.`,
                    type: 'reservation',
                    data: { reservation_id: reservation.id, shop_id: id }
                }]);
            }

            alert('Reservation sent! The shop will notify you once confirmed.');
            setIsBookingModalOpen(false);
        } catch (err: any) {
            alert('Failed to book: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!currentUser) {
            alert('Please login to write a review.');
            return;
        }

        setIsSubmittingReview(true);
        try {
            const { error } = await supabase
                .from('reviews')
                .insert([{
                    shop_id: id,
                    user_id: currentUser.id,
                    rating: userRating,
                    comment: userComment
                }]);

            if (error) {
                if (error.code === '23505') {
                    alert('You have already reviewed this shop.');
                } else {
                    throw error;
                }
            } else {
                alert('Review submitted successfully!');
                setIsReviewModalOpen(false);
                setUserComment('');
                // Refresh reviews
                const { data } = await supabase
                    .from('reviews')
                    .select('*, user:users(nickname, avatar_url)')
                    .eq('shop_id', id)
                    .order('created_at', { ascending: false });
                if (data) {
                    setReviews(data);
                    const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
                    setAverageRating(Number(avg.toFixed(1)) || 0);
                }
            }
        } catch (err: any) {
            alert('Failed to submit review: ' + err.message);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">{t('no_shops', language)}</h1>
                <button
                    onClick={() => router.back()}
                    className="bg-zinc-800 px-6 py-2 rounded-full text-white"
                >
                    Back
                </button>
            </div>
        );
    }

    const toggleMap = () => {
        const nextState = !isMapExpanded;
        setIsMapExpanded(nextState);
        if (nextState) {
            trackAnalyticsEvent({ shopId: id as string, eventType: 'map_view' });
        }
    };

    return (
        <div className="bg-black min-h-screen text-white relative overflow-hidden">
            {/* <TopNav /> */} {/* TopNav was removed as per the diff */}

            {/* Background Map (Simulated with Placeholder or Embed) */}
            <div className={`fixed inset-0 z-0 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${isMapExpanded ? 'opacity-100 scale-105' : 'opacity-40 scale-100'}`}>
                {(shop.map_url || shop.address || shop.location || shop.area) ? (
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        src={getMapEmbedUrl(shop.map_url || shop.address || shop.location, shop.name, shop.area) || ''}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <span className="text-zinc-700">Map Background</span>
                    </div>
                )}
            </div>

            {/* Content Overlay */}
            <main 
                className={`relative z-10 pt-6 pb-32 px-4 max-w-md mx-auto min-h-screen flex flex-col justify-end transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] ${isMapExpanded ? 'translate-y-[85%]' : 'translate-y-0'}`}
            >
                {/* Hero Image Section */}
                {!isMapExpanded && (
                    <div className="mb-6 group relative aspect-video rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-1000">
                        {shop.main_image_url ? (
                            <img 
                                src={shop.main_image_url} 
                                alt={shop.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s]"
                            />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl opacity-20">📸</div>
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Brand Image Placeholder</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                        
                        {/* Overlaid Info */}
                        <div className="absolute bottom-6 left-8 right-8 animate-in slide-in-from-bottom-4 duration-1000">
                            <h1 className="text-3xl font-black text-white tracking-tighter mb-1 drop-shadow-2xl leading-none">{shop.name}</h1>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-pink-600 text-[8px] font-black uppercase tracking-[0.2em] rounded-md shadow-xl">{shop.category || 'Premium'}</span>
                                <p className="text-white/90 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 drop-shadow-lg">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    {shop.area}
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">Live Now</span>
                        </div>
                    </div>
                )}

                <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-6 relative">
                    {/* SNS and Review Stats Bar */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                        <div className="flex gap-4">
                            {['Facebook', 'Instagram', 'TikTok', 'X', 'LINE', 'WhatsApp', 'Viber', 'Telegram'].map(platform => {
                                const link = shop.sns_links?.[platform.toLowerCase()];
                                if (!link?.url) return null;
                                const LogoComponent = (SNSLogos as any)[platform];
                                return (
                                    <a 
                                        key={platform} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={() => trackAnalyticsEvent({ shopId: id as string, eventType: 'sns_click', metadata: { platform } })}
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all border border-white/10 active:scale-90"
                                    >
                                        <LogoComponent className="w-5 h-5" />
                                    </a>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-3 bg-zinc-900/50 py-1.5 pl-3 pr-1.5 rounded-full border border-white/5">
                            <div className="flex items-center gap-1">
                                <span className="text-yellow-500 text-sm">⭐</span>
                                <span className="text-sm font-black">{averageRating || 'New'}</span>
                            </div>
                            <button 
                                onClick={() => setIsReviewModalOpen(true)}
                                className="px-3 py-1.5 bg-pink-600 text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-pink-500 transition-colors shadow-lg shadow-pink-900/20"
                            >
                                Review
                            </button>
                        </div>
                    </div>
                    {/* Map Expansion Trigger / Handle */}
                    {isMapExpanded && (
                        <div 
                            className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer group"
                            onClick={() => setIsMapExpanded(false)}
                        >
                            <div className="w-12 h-1 bg-white/20 rounded-full group-hover:bg-white/40 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60">Tap to close map</span>
                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white mt-1 group-hover:scale-110 transition-transform">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                            </div>
                        </div>
                    )}


                    <div className="space-y-4 text-sm">
                        <div 
                            className={`group relative overflow-hidden p-4 rounded-2xl border transition-all duration-500 cursor-pointer active:scale-[0.98] ${
                                isMapExpanded 
                                ? 'bg-pink-500/10 border-pink-500/30 shadow-lg shadow-pink-500/10' 
                                : 'bg-transparent border-white/10 hover:border-pink-500/30'
                            }`}
                            onClick={toggleMap}
                        >
                            {/* Glassmorphism Window Effect */}
                            <div className="absolute inset-0 z-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
                            
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <h3 className="text-pink-500 font-bold uppercase text-[10px] tracking-widest mb-2 flex items-center gap-2">
                                        {t('address', language)}
                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                                    </h3>
                                    <p className="text-zinc-200 leading-relaxed drop-shadow-md font-medium">
                                        {shop.address && !shop.address.includes('http') ? shop.address : (shop.location || shop.area)}
                                    </p>
                                </div>
                                <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 ${isMapExpanded ? 'bg-pink-500 text-white rotate-180 scale-110' : 'bg-white/5 text-zinc-400 group-hover:text-pink-500 group-hover:scale-110'}`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                                </div>
                            </div>
                            
                            {/* Tap Hint */}
                            {!isMapExpanded && (
                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                    <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Tap to reveal full map</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                                <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('phone', language)}</h3>
                                <p className="text-zinc-200">{shop.phone || '-'}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                                <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('holiday', language)}</h3>
                                <p className="text-zinc-200">{shop.holiday || '-'}</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                            <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('opening_hours', language)}</h3>
                            <p className="text-zinc-200 whitespace-pre-line">{shop.opening_hours || '-'}</p>
                        </div>
                    </div>

                    {/* Rooms Section */}
                    {rooms.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Available Rooms</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {rooms.map((room) => (
                                    <div key={room.id} className="bg-zinc-900/80 border border-zinc-800 rounded-3xl overflow-hidden flex gap-4 p-3 items-center group active:scale-[0.98] transition-all" onClick={() => handleRoomSelect(room)}>
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                                            {(room.main_image_url || room.image_url) ? (
                                                <img 
                                                    src={room.main_image_url || room.image_url} 
                                                    alt={room.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800/50">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest relative z-10">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-lg truncate">{room.name}</h4>
                                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{room.capacity} People Max</p>
                                            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                                                {room.tags?.slice(0, 3).map(tag => (
                                                    <span key={tag} className="flex-shrink-0 px-2 py-0.5 bg-pink-500/10 text-pink-500 text-[8px] font-bold uppercase rounded-md border border-pink-500/20">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right pr-2">
                                            <p className="text-pink-500 font-black text-sm">{room.price_per_hour?.toLocaleString()}</p>
                                            <p className="text-[8px] text-zinc-600 font-black uppercase">MMK/H</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shop Events */}
                    {events.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Exclusive Events</h3>
                            <div className="space-y-4">
                                {events.map((event) => (
                                    <div key={event.id} className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-3xl overflow-hidden relative group">
                                        <div className="aspect-[21/9] relative overflow-hidden">
                                            {event.image_url ? (
                                                <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-600 font-black uppercase tracking-widest">No Poster</div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                            <div className="absolute bottom-4 left-6">
                                                <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] mb-1">
                                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <h4 className="text-lg font-black text-white tracking-tight">{event.title}</h4>
                                            </div>
                                        </div>
                                        <div className="p-6 pt-2">
                                            <p className="text-zinc-400 text-xs font-medium line-clamp-2 mb-4">
                                                {event.description}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase">
                                                        <span>📍</span> {event.place || event.location || 'Venue TBD'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase border-l border-white/10 pl-3">
                                                        <span>💰</span> {event.fee || 'Free'}
                                                    </div>
                                                </div>
                                                <button className="px-4 py-2 bg-pink-600/10 text-pink-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-pink-500/20 active:scale-95 transition-all">
                                                    Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Shop Posts (Thumbnails) */}
                    <div>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">{t('shop_posts', language)}</h3>
                            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{shopPosts.length} POSTS</span>
                        </div>
                        
                        {shopPosts.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {shopPosts.map((post) => (
                                    <Link 
                                        key={post.id} 
                                        href={`/home?postId=${post.id}`}
                                        className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden relative group cursor-pointer border border-white/5 active:scale-95 transition-transform"
                                    >
                                        {post.main_image_url ? (
                                            isBunnyStream(post.main_image_url) ? (
                                                <div className="w-full h-full relative">
                                                    <video 
                                                        src={getBunnyStreamVideoUrl(post.main_image_url) || ''} 
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        playsInline
                                                        // @ts-ignore
                                                        webkit-playsinline="true"
                                                        loop
                                                        onMouseOver={(e) => e.currentTarget.play()}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.pause();
                                                            e.currentTarget.currentTime = 0;
                                                        }}
                                                        onTouchStart={(e) => e.currentTarget.play()}
                                                    />
                                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                                    </div>
                                                </div>
                                            ) : isVideo(post.main_image_url) ? (
                                                <div className="w-full h-full relative">
                                                    <video 
                                                        src={post.main_image_url} 
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        playsInline
                                                        // @ts-ignore
                                                        webkit-playsinline="true"
                                                        onTouchStart={(e) => e.currentTarget.play()}
                                                    />
                                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                                    </div>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={post.main_image_url} 
                                                    className="w-full h-full object-cover" 
                                                    alt="" 
                                                />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                <span className="text-[8px] opacity-20 uppercase font-black">No Media</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-zinc-900/30 border border-dashed border-white/5 rounded-3xl py-12 text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-xl opacity-20">📸</div>
                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No recent posts</p>
                            </div>
                        )}
                    </div>

                    {/* Reviews Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Customer Feedback</h3>
                            {reviews.length > 0 && (
                                <span className="text-[10px] font-black text-zinc-500">{reviews.length} REVIEWS</span>
                            )}
                        </div>

                        {reviews.length > 0 ? (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 no-scrollbar">
                                {reviews.map((review) => (
                                    <div key={review.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                                    {review.user?.avatar_url ? (
                                                        <img src={review.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-black opacity-20">U</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase">{review.user?.nickname || 'Customer'}</p>
                                                    <div className="flex gap-0.5 mt-0.5">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className={`text-[8px] ${i < review.rating ? 'text-yellow-500' : 'text-zinc-700'}`}>⭐</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-bold text-zinc-600 uppercase">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {review.comment && (
                                            <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                                {review.comment}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-zinc-900/30 border border-dashed border-white/5 rounded-3xl py-8 text-center cursor-pointer hover:bg-zinc-900/50 transition-colors" onClick={() => setIsReviewModalOpen(true)}>
                                <div className="text-2xl mb-2 opacity-20">⭐</div>
                                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No reviews yet. Be the first!</p>
                            </div>
                        )}
                    </div>

                    <button className="w-full bg-zinc-800/80 text-zinc-400 py-4 rounded-2xl font-bold text-lg cursor-not-allowed">
                        Select a room above to reserve
                    </button>
                </div>
            </main>

            {/* Booking Modal */}
            {selectedRoom && isBookingModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsBookingModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 space-y-8 animate-in slide-in-from-bottom duration-500 shadow-2xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">{selectedRoom.name}</h3>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Confirm your schedule</p>
                            </div>
                            <button onClick={() => setIsBookingModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Reservation Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                    value={bookingDate}
                                    onChange={handleDateChange}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">From</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Until</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest">Total Estimation</p>
                                    <p className="text-xl font-black text-pink-500">
                                        {paymentMethod === 'dtip' ? (
                                            <>
                                                {Math.ceil(((selectedRoom.price_per_hour || 0) * 2) / 1000)} <span className="text-[10px] tracking-normal">dtip</span>
                                            </>
                                        ) : (
                                            <>
                                                {(selectedRoom.price_per_hour * 2).toLocaleString()} <span className="text-[10px] tracking-normal">MMK</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Duration</p>
                                    <p className="font-bold">2 Hours</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Payment Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`py-3 rounded-xl border font-black text-[10px] tracking-widest uppercase transition-all ${paymentMethod === 'cash' ? 'bg-white text-black border-white' : 'bg-transparent text-white border-white/10 opacity-40 hover:opacity-100'}`}
                                    >
                                        CASH / MMK
                                    </button>
                                    <button 
                                        onClick={() => setPaymentMethod('dtip')}
                                        className={`py-3 rounded-xl border font-black text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${paymentMethod === 'dtip' ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-900/40' : 'bg-transparent text-white border-white/10 opacity-40 hover:opacity-100'}`}
                                    >
                                        <span>🪙</span> pay with dtip
                                    </button>
                                </div>
                                {paymentMethod === 'dtip' && (
                                    <p className="text-[9px] text-zinc-500 font-bold italic px-2">
                                        Balance: {userWallet?.balance || 0} dtip (1 dtip = 1,000 MMK)
                                    </p>
                                )}
                            </div>

                            <button 
                                onClick={handleBookingSubmit}
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase shadow-2xl shadow-pink-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? 'PROCESSING...' : 'SEND RESERVATION'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            {isReviewModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsReviewModalOpen(false)} />
                    <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 space-y-8 animate-in zoom-in duration-300 shadow-[0_0_50px_rgba(236,72,153,0.1)]">
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-black tracking-tight">Write a Review</h3>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Share your experience with others</p>
                        </div>

                        <div className="space-y-8 text-center">
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star}
                                        onClick={() => setUserRating(star)}
                                        className={`text-3xl transition-all ${star <= userRating ? 'scale-125 grayscale-0' : 'scale-100 grayscale opacity-30'} hover:scale-135`}
                                    >
                                        ⭐
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 text-left">Your Comment</label>
                                <textarea 
                                    rows={4}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-6 text-sm font-medium focus:outline-none focus:border-pink-500 transition-colors placeholder:text-zinc-700"
                                    placeholder="Tell us what you liked (or didn't like)..."
                                    value={userComment}
                                    onChange={(e) => setUserComment(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleReviewSubmit}
                                disabled={isSubmittingReview || !userRating}
                                className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase shadow-2xl shadow-pink-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmittingReview ? 'POSTING...' : 'SUBMIT REVIEW'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
