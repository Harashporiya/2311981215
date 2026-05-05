import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Log } from "@/lib/logger";
import { invalidateCache } from "@/lib/cache";

// PATCH /api/v1/notifications/[id]/read - Mark single notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") || "default-student";

  await Log(
    "backend",
    "info",
    "handler",
    `PATCH /api/v1/notifications/${id}/read - studentId: ${studentId}`
  );

  try {
    const updated = await prisma.studentNotification.update({
      where: {
        studentId_notificationId: {
          studentId,
          notificationId: id,
        },
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: { notification: true },
    });

    // Invalidate cache for this student
    await invalidateCache(`notif:*:${studentId}*`);

    await Log(
      "backend",
      "info",
      "service",
      `Notification ${id} marked as read for student ${studentId}`
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updated.notificationId,
        isRead: updated.isRead,
        readAt: updated.readAt,
      },
    });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `PATCH /api/v1/notifications/${id}/read failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return NextResponse.json(
      { success: false, error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
