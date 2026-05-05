import { NextRequest, NextResponse } from "next/server";
import { Log } from "@/lib/logger";
import { getTopNPriorityNotifications } from "@/lib/priorityInbox";

// GET /api/v1/notifications/priority
// Returns top-N priority notifications using the Affordmed Notification API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = parseInt(searchParams.get("n") || "10");

  await Log(
    "backend",
    "info",
    "handler",
    `GET /api/v1/notifications/priority - Requested top ${n} priority notifications`
  );

  try {
    // Get auth token from request header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await Log(
        "backend",
        "warn",
        "handler",
        "GET /api/v1/notifications/priority - Missing or invalid Authorization header"
      );
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const baseURL = process.env.AFFORDMED_BASE_URL || "http://20.207.122.201";

    const topNotifications = await getTopNPriorityNotifications(
      n,
      accessToken,
      baseURL
    );

    await Log(
      "backend",
      "info",
      "handler",
      `GET /api/v1/notifications/priority - Returned ${topNotifications.length} priority notifications`
    );

    return NextResponse.json({
      success: true,
      data: {
        notifications: topNotifications,
        count: topNotifications.length,
        requestedN: n,
      },
    });
  } catch (error) {
    await Log(
      "backend",
      "error",
      "handler",
      `GET /api/v1/notifications/priority failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch priority notifications" },
      { status: 500 }
    );
  }
}
