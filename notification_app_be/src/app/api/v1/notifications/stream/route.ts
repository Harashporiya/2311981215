import { NextRequest } from "next/server";
import { Log } from "@/lib/logger";

// GET /api/v1/notifications/stream - Server-Sent Events for real-time notifications
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") || "default-student";

  await Log(
    "backend",
    "info",
    "handler",
    `SSE /api/v1/notifications/stream - Student ${studentId} connected`
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        message: "Connected to notification stream",
        studentId,
        timestamp: new Date().toISOString(),
      })}\n\n`;

      controller.enqueue(encoder.encode(connectEvent));

      // Send periodic ping to keep connection alive
      const pingInterval = setInterval(async () => {
        try {
          const pingEvent = `event: ping\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString(),
          })}\n\n`;
          controller.enqueue(encoder.encode(pingEvent));
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000); // Every 30 seconds

      // Simulate real-time notification push (in production: Redis Pub/Sub)
      // In production, this would subscribe to a Redis channel for this student
      // and forward messages as SSE events

      // Clean up on close
      request.signal.addEventListener("abort", async () => {
        clearInterval(pingInterval);
        await Log(
          "backend",
          "info",
          "handler",
          `SSE /api/v1/notifications/stream - Student ${studentId} disconnected`
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    },
  });
}
