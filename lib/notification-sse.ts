// Store active connections by branch - this could be in a database in production
const connections: Map<string, Set<WritableStreamDefaultWriter>> = new Map();

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