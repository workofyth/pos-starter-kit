import { NextRequest } from 'next/server';

// Store active connections by branch
const connections: Map<string, Set<WritableStreamDefaultWriter>> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get('branchId');

  if (!branchId) {
    return new Response('Branch ID is required', { status: 400 });
  }

  // Create a server-sent events response
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Add this connection to the branch's connections
  if (!connections.has(branchId)) {
    connections.set(branchId, new Set());
  }
  const branchConnections = connections.get(branchId)!;
  branchConnections.add(writer);

  // Send initial connection message
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', branchId })}\n\n`));

  // Handle connection close
  const onClose = () => {
    branchConnections.delete(writer);
    if (branchConnections.size === 0) {
      connections.delete(branchId);
    }
  };

  // Set up cleanup when client disconnects
  request.signal.addEventListener('abort', onClose);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Function to broadcast notification to a specific branch
export function broadcastToBranch(branchId: string, notification: any) {
  const branchConnections = connections.get(branchId);
  if (!branchConnections) return;

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ type: 'notification', notification })}\n\n`;

  branchConnections.forEach(async (writer) => {
    try {
      await writer.write(encoder.encode(data));
    } catch (error) {
      // Remove broken connections
      branchConnections.delete(writer);
      if (branchConnections.size === 0) {
        connections.delete(branchId);
      }
    }
  });
}

// Function to broadcast to all connections (for testing)
export function broadcastToAll(notification: any) {
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ type: 'notification', notification })}\n\n`;

  connections.forEach((branchConnections) => {
    branchConnections.forEach(async (writer) => {
      try {
        await writer.write(encoder.encode(data));
      } catch (error) {
        // Handle connection errors
      }
    });
  });
}