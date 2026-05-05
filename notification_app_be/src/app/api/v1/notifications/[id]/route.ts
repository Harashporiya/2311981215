import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Log } from "@/lib/logger";

// GET /api/v1/notifications/[id]
export async function GET(
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
    `GET /api/v1/notifications/${id} - studentId: ${studentId}`
  );

  try {
    const studentNotification = await prisma.studentNotification.findUnique({
      where: {
        studentId_notificationId: {
          studentId,
          notificationId: id,
        },
      },
      include: { notification: true },
    });

    if (!studentNotification) {
      await Log(
        "backend",
        "warn",
        "handler",
        `GET /api/v1/notifications/${id} - Notification not found for student ${studentId}`
      );
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: studentNotification.notification.id,
        type: studentNotification.notification.type,
        message: studentNotification.notification.message,
        isRead: studentNotification.isRead,
        readAt: studentNotification.readAt,
        createdAt: studentNotification.notification.createdAt,
      },
    });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `GET /api/v1/notifications/${id} failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch notification" },
      { status: 500 }
    );
  }
}
