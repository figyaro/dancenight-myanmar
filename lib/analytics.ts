import { supabase } from './supabase';

export type AnalyticsEventType = 
  | 'shop_impression' 
  | 'post_impression' 
  | 'map_view' 
  | 'action_click' 
  | 'reservation_click' 
  | 'sns_click' 
  | 'post_click'
  | 'like_click'
  | 'comment_click';

export async function trackAnalyticsEvent(params: {
  shopId?: string;
  postId?: string;
  eventType: AnalyticsEventType;
  metadata?: Record<string, any>;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // We use insert but don't await the result heavily to avoid blocking UI
    supabase
      .from('analytics_events')
      .insert([{
        shop_id: params.shopId,
        post_id: params.postId,
        event_type: params.eventType,
        user_id: userId,
        metadata: params.metadata || {}
      }])
      .then(({ error }) => {
        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Analytics tracking error:', error.message);
          }
        }
      });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Analytics tracking failed:', err);
    }
  }
}
