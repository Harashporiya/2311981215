import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Log } from "@/lib/logger";
import { getOrCache } from "@/lib/cache";
import { z } from "zod";

// GET /api/v1/notifications - Fetch all notifications for a student
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") || "default-student";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const type = searchParams.get("type") as "Placement" | "Event" | "Result" | null;
  const isReadParam = searchParams.get("isRead");

  await Log(
    "backend",
    "info",
    "handler",
    `GET /api/v1/notifications - studentId: ${studentId}, page: ${page}, limit: ${limit}, type: ${type}`
  );

  try {
    const skip = (page - 1) * limit;

    const cacheKey = `notif:list:${studentId}:${page}:${limit}:${type}:${isReadParam}`;

    const result = await getOrCache(
      cacheKey,
      async () => {
        await Log(
          "backend",
          "debug",
          "repository",
          `Querying DB for notifications: studentId=${studentId}, page=${page}`
        );

        const where: {
          studentId: string;
          isRead?: boolean;
          notification?: { type?: "Placement" | "Event" | "Result" };
        } = { studentId };

        if (isReadParam !== null) {
          where.isRead = isReadParam === "true";
        }

        if (type) {
          where.notification = { type };
        }

        const [studentNotifications, total] = await Promise.all([
          prisma.studentNotification.findMany({
            where,
            include: {
              notification: true,
            },
            orderBy: {
              notification: {
                createdAt: "desc",
              },
            },
            skip,
            take: limit,
          }),
          prisma.studentNotification.count({ where }),
        ]);

        const notifications = studentNotifications.map((sn) => ({
          id: sn.notification.id,
          type: sn.notification.type,
          message: sn.notification.message,
          isRead: sn.isRead,
          readAt: sn.readAt,
          createdAt: sn.notification.createdAt,
        }));

        return {
          notifications,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      60 // 60s TTL
    );

    await Log(
      "backend",
      "info",
      "handler",
      `GET /api/v1/notifications - Returned ${result.notifications.length} notifications for student ${studentId}`
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `GET /api/v1/notifications failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST /api/v1/notifications - Send notification to a student
const sendSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(["Placement", "Event", "Result"]),
  message: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  await Log("backend", "info", "handler", "POST /api/v1/notifications - Send notification request received");

  try {
    const body = await request.json();
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      await Log(
        "backend",
        "warn",
        "handler",
        `POST /api/v1/notifications - Validation failed: ${JSON.stringify(parsed.error.flatten())}`
      );
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { studentId, type, message } = parsed.data;

    await Log(
      "backend",
      "info",
      "service",
      `Creating notification for student ${studentId}: type=${type}, message="${message}"`
    );

    // Create notification
    const notification = await prisma.notification.create({
      data: { type, message },
    });

    // Link to student
    await prisma.studentNotification.create({
      data: {
        studentId,
        notificationId: notification.id,
      },
    });

    await Log(
      "backend",
      "info",
      "service",
      `Notification ${notification.id} created and linked to student ${studentId} successfully`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          notificationId: notification.id,
          status: "delivered",
          createdAt: notification.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `POST /api/v1/notifications failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      { success: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
