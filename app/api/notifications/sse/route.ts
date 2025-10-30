import { NextRequest } from 'next/server';

// GET - Server Sent Events endpoint for real-time notifications
export async function GET(request: NextRequest) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  };

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const sendEvent = (data: any) => {
        const encodedData = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(encodedData));
      };

      sendEvent({ type: 'connected', message: 'Connected to notification stream' });

      // In a real implementation, you would subscribe to a Redis channel or database notifications
      // and push updates to the client when they occur
      
      // For demonstration purposes, we'll send a periodic event
      const interval = setInterval(() => {
        // Randomly generate events to simulate real notifications
        if (Math.random() > 0.9) { // 10% chance of event every 15 seconds to make it more realistic
          const notificationTypes = [
            'stock_split_request',
            'stock_split_approved',
            'stock_split_rejected',
            'stock_split_resent'
          ];
          
          const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
          
          const newNotification = {
            id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
            type: randomType,
            title: randomType === 'stock_split_request' ? 'New Stock Request' :
                   randomType === 'stock_split_approved' ? 'Transfer Approved' :
                   randomType === 'stock_split_rejected' ? 'Transfer Rejected' : 'Transfer Resent',
            message: randomType === 'stock_split_request' ? 'New stock transfer request received' :
                     randomType === 'stock_split_approved' ? 'Stock transfer approved' :
                     randomType === 'stock_split_rejected' ? 'Stock transfer rejected' :
                     'Stock transfer resent for approval',
            timestamp: new Date(),
            data: {
              productId: `prod_${Math.random().toString(36).substr(2, 9)}`,
              quantity: Math.floor(Math.random() * 100) + 1,
              sourceBranch: 'Sub Branch A',
              targetBranch: 'Main Branch'
            }
          };
          
          sendEvent(newNotification);
        }
      }, 15000); // Check every 15 seconds
      
      // Handle connection close
      request.signal.onabort = () => {
        console.log('SSE connection closed by client');
        clearInterval(interval);
        controller.close();
      };
    },
  });

  return new Response(stream, { headers });
}