import { NextRequest } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

// GET - Server Sent Events endpoint for real-time notifications
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');
  
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (e) {
      // Stream closed
    }
  };

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  };

  const redis = await getRedis();
  if (!redis) {
    return new Response('Redis not available', { status: 500 });
  }

  // Define handler outside for removal
  const handleMessage = (message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'notification') {
        sendEvent({
          ...data.notification,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('[SSE] Error parsing Redis message:', error);
    }
  };

  // Channels
  const branchChannel = branchId ? `channel:notifications:${branchId}` : null;
  const globalChannel = 'channel:notifications:all';

  // Subscription setup
  const setupSubscription = async () => {
    if (branchChannel) await redis.subscribe(branchChannel, handleMessage);
    await redis.subscribe(globalChannel, handleMessage);
    
    await sendEvent({ type: 'connected', message: 'Connected to notification stream' });
  };

  setupSubscription();

  // Ping interval
  const pingInterval = setInterval(() => {
    sendEvent({ type: 'ping' });
  }, 30000);

  // Clean up
  request.signal.onabort = async () => {
    clearInterval(pingInterval);
    if (branchChannel) await redis.unsubscribe(branchChannel, handleMessage);
    await redis.unsubscribe(globalChannel, handleMessage);
    try {
      await writer.close();
    } catch (e) {}
  };

  return new Response(responseStream.readable, { headers });
}