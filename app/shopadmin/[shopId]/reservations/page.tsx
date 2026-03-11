'use client';

import { useState } from 'react';

export default function ShopReservationManagement() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-xl font-black uppercase tracking-tight">Booking & Inquiry Queue</h2>
            
            <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-3xl text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-3xl mx-auto mb-6">📅</div>
                <h3 className="text-xl font-black mb-3">Manage Customer Reservations</h3>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto font-medium leading-relaxed mb-8">
                    View incoming booking requests, manage table availability, and confirm inquiries with customers.
                </p>
                <div className="py-20 border border-dashed border-white/10 rounded-3xl">
                    <p className="text-zinc-600 font-bold italic">Reservation queue is empty.</p>
                </div>
            </div>
        </div>
    );
}
