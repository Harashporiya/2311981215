import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Log } from "@/lib/logger";
import { getOrCache } from "@/lib/cache";

// GET /api/v1/notifications/unread-count
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") || "default-student";

  await Log(
    "backend",
    "info",
    "handler",
    `GET /api/v1/notifications/unread-count - studentId: ${studentId}`
  );

  try {
    const cacheKey = `notif:unread:${studentId}`;

    const count = await getOrCache(
      cacheKey,
      async () => {
        await Log(
          "backend",
          "debug",
          "repository",
          `Querying DB for unread count: studentId=${studentId}`
        );
        return prisma.studentNotification.count({
          where: { studentId, isRead: false },
        });
      },
      30 // 30s TTL for unread counts
    );

    await Log(
      "backend",
      "info",
      "handler",
      `GET /api/v1/notifications/unread-count - student ${studentId} has ${count} unread notifications`
    );

    return NextResponse.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `GET /api/v1/notifications/unread-count failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { success: false, error: "Failed to get unread count" },
      { status: 500 }
    );
  }
}
