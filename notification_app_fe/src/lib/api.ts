import {
  NotificationsResponse,
  PriorityNotificationsResponse,
  UnreadCountResponse,
} from "@/types/notification";
import { Log } from "@/lib/logger";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const AFFORDMED_BASE =
  process.env.NEXT_PUBLIC_AFFORDMED_BASE_URL || "http://20.207.122.201";

// Default student ID - in production this comes from auth context
const DEFAULT_STUDENT_ID = "student-001";

async function getAuthToken(): Promise<string> {
  // In production: fetch from auth context / localStorage
  // For evaluation: return a placeholder that gets replaced by the real token
  const clientID = process.env.NEXT_PUBLIC_CLIENT_ID || "";
  const clientSecret = process.env.NEXT_PUBLIC_CLIENT_SECRET || "";

  if (!clientID || !clientSecret) {
    return "";
  }

  try {
    const res = await fetch(`${AFFORDMED_BASE}/evaluation-service/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientID, clientSecret }),
    });
    const data = await res.json();
    return data.access_token || "";
  } catch {
    return "";
  }
}

export const notificationApi = {
  // Fetch all notifications (from our backend)
  async getAll(
    page = 1,
    limit = 20,
    type?: string,
    isRead?: boolean
  ): Promise<NotificationsResponse> {
    await Log(
      "frontend",
      "info",
      "api",
      `Fetching notifications: page=${page}, limit=${limit}, type=${type}`
    );

    const params = new URLSearchParams({
      studentId: DEFAULT_STUDENT_ID,
      page: String(page),
      limit: String(limit),
    });
    if (type) params.set("type", type);
    if (isRead !== undefined) params.set("isRead", String(isRead));

    const res = await fetch(`${API_BASE}/api/v1/notifications?${params}`);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  },

  // Fetch priority inbox - directly from Affordmed API
  async getPriority(n = 10): Promise<PriorityNotificationsResponse> {
    await Log(
      "frontend",
      "info",
      "api",
      `Fetching priority notifications: top ${n}`
    );

    const token = await getAuthToken();

    const res = await fetch(
      `${API_BASE}/api/v1/notifications/priority?n=${n}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    if (!res.ok) throw new Error("Failed to fetch priority notifications");
    return res.json();
  },

  // Get unread count
  async getUnreadCount(): Promise<UnreadCountResponse> {
    await Log("frontend", "info", "api", "Fetching unread notification count");

    const res = await fetch(
      `${API_BASE}/api/v1/notifications/unread-count?studentId=${DEFAULT_STUDENT_ID}`
    );
    if (!res.ok) throw new Error("Failed to fetch unread count");
    return res.json();
  },

  // Mark single as read
  async markAsRead(notificationId: string): Promise<void> {
    await Log(
      "frontend",
      "info",
      "api",
      `Marking notification ${notificationId} as read`
    );

    const res = await fetch(
      `${API_BASE}/api/v1/notifications/${notificationId}/read?studentId=${DEFAULT_STUDENT_ID}`,
      { method: "PATCH" }
    );
    if (!res.ok) throw new Error("Failed to mark notification as read");
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    await Log("frontend", "info", "api", "Marking all notifications as read");

    const res = await fetch(
      `${API_BASE}/api/v1/notifications/read-all?studentId=${DEFAULT_STUDENT_ID}`,
      { method: "PATCH" }
    );
    if (!res.ok) throw new Error("Failed to mark all notifications as read");
  },

  // Subscribe to SSE stream
  subscribeToStream(
    studentId: string,
    onNotification: (data: unknown) => void
  ): EventSource {
    const eventSource = new EventSource(
      `${API_BASE}/api/v1/notifications/stream?studentId=${studentId}`
    );

    eventSource.addEventListener("notification", (e) => {
      try {
        const data = JSON.parse(e.data);
        onNotification(data);
      } catch {
        // ignore parse errors
      }
    });

    return eventSource;
  },
};
