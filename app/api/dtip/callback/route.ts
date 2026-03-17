import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
    try {
        const { userId, amount, transactionId } = await req.json();

        if (!userId || !amount) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Run the atomic transaction RPC for a purchase
        // In a purchase, sender is null (from system)
        const { data: success, error } = await supabase.rpc('process_dtip_transaction', {
            p_sender_id: null,
            p_receiver_id: userId,
            p_amount: amount,
            p_transaction_type: 'purchase',
            p_reference_type: 'coin_store',
            p_reference_id: transactionId || null
        });

        if (error || !success) {
            console.error('Callback error:', error);
            return NextResponse.json({ error: error?.message || 'Transaction failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: `Successfully added ${amount} dtip to user ${userId}` });
    } catch (err: any) {
        console.error('API Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
