import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Log } from "@/lib/logger";
import { invalidateCache } from "@/lib/cache";

// PATCH /api/v1/notifications/read-all
export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") || "default-student";

  await Log(
    "backend",
    "info",
    "handler",
    `PATCH /api/v1/notifications/read-all - Marking all as read for student: ${studentId}`
  );

  try {
    const result = await prisma.studentNotification.updateMany({
      where: { studentId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    // Invalidate all cached data for this student
    await invalidateCache(`notif:*:${studentId}*`);

    await Log(
      "backend",
      "info",
      "service",
      `Marked ${result.count} notifications as read for student ${studentId}`
    );

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
    });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `PATCH /api/v1/notifications/read-all failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { success: false, error: "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
