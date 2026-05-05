"use client";

import { Notification, NotificationType } from "@/types/notification";

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
}

const typeConfig: Record<
  NotificationType,
  { label: string; color: string; bg: string; icon: string }
> = {
  Placement: {
    label: "Placement",
    color: "#1a6b2e",
    bg: "#e6f4ea",
    icon: "💼",
  },
  Result: {
    label: "Result",
    color: "#1a3a6b",
    bg: "#e6eef4",
    icon: "📊",
  },
  Event: {
    label: "Event",
    color: "#6b4a1a",
    bg: "#f4eee6",
    icon: "📅",
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationCard({
  notification,
  onMarkRead,
}: NotificationCardProps) {
  const config = typeConfig[notification.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "1rem",
        padding: "1.25rem 1.5rem",
        background: notification.isRead ? "#fff" : "#f0f7ff",
        borderLeft: notification.isRead
          ? "4px solid transparent"
          : "4px solid #2563eb",
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease",
        cursor: "pointer",
        position: "relative",
      }}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      {/* Type badge */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          minWidth: "60px",
        }}
      >
        <span style={{ fontSize: "1.5rem" }}>{config.icon}</span>
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: config.color,
            background: config.bg,
            padding: "2px 6px",
            borderRadius: "4px",
            textTransform: "uppercase",
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: notification.isRead ? 400 : 600,
            color: "#1e293b",
            lineHeight: 1.5,
          }}
        >
          {notification.message}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "0.75rem",
            color: "#94a3b8",
          }}
        >
          {formatDate(notification.createdAt)}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#2563eb",
            marginTop: "4px",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}
