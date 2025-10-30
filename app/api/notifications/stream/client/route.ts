import { NextRequest } from 'next/server';
import { addConnection, ConnectionWriter } from '@/lib/notification-sse';

interface ControllerWithCleanup extends ReadableStreamDefaultController {
  cleanup?: () => void;
  interval?: NodeJS.Timeout;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');
  
  if (!branchId) {
    return new Response(
      JSON.stringify({ success: false, message: 'Branch ID is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a server-sent events response
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller: ControllerWithCleanup) {
      // Track if the connection has been closed to avoid double-closing
      let isClosed = false;
      
      // Send initial connection message
      if (!isClosed) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\\n\\n`));
      }
      
      // Create a typed writer for the connection
      const writer: ConnectionWriter = {
        write: async (chunk: Uint8Array) => {
          try {
            if (!isClosed) {
              controller.enqueue(chunk);
            }
          } catch (error) {
            console.error('Error writing to SSE stream:', error);
          }
        },
        enqueue: async (chunk: Uint8Array) => {
          try {
            if (!isClosed) {
              controller.enqueue(chunk);
            }
          } catch (error) {
            console.error('Error enqueuing to SSE stream:', error);
          }
        }
      };
      
      // Add this connection to the SSE connections for this branch
      const cleanup = addConnection(branchId, writer);
      
      // Set up interval to check for new notifications (if needed)
      const interval = setInterval(() => {
        try {
          // This is where we can periodically check for new notifications if needed
          // For now we'll just send a heartbeat to keep the connection alive
          if (!isClosed) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\\n\\n`));
          } else {
            // If closed, clear the interval to stop trying to send heartbeats
            clearInterval(interval);
          }
        } catch (error) {
          // Controller might be closed already, so we just clear the interval and cleanup
          clearInterval(interval);
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (closeError) {
              // It's fine if the controller is already closed, just continue with cleanup
            }
          }
          cleanup();
        }
      }, 60000); // Send heartbeat every 60 seconds to reduce connection traffic
      
      // Store cleanup and interval references for proper cleanup
      controller.cleanup = () => {
        if (!isClosed) {
          isClosed = true;
          cleanup();
        }
      };
      controller.interval = interval;
    },
    cancel(controller: ControllerWithCleanup) {
      // Clean up when client disconnects
      if (controller.interval) {
        clearInterval(controller.interval);
      }
      if (controller.cleanup) {
        controller.cleanup();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}