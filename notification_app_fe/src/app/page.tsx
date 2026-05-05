"use client";

import { useState, useEffect, useCallback } from "react";
import { notificationApi } from "@/lib/api";
import { Log } from "@/lib/logger";
import {
  Notification,
  PriorityNotification,
  NotificationType,
} from "@/types/notification";
import NotificationCard from "@/components/NotificationCard";
import PriorityInbox from "@/components/PriorityInbox";

type TabType = "all" | "priority";
type FilterType = "all" | NotificationType;

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [priorityNotifications, setPriorityNotifications] = useState<
    PriorityNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [topN, setTopN] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Log(
        "frontend",
        "info",
        "page",
        `Fetching notifications: filter=${filter}, page=${page}`
      );

      const res = await notificationApi.getAll(
        page,
        20,
        filter === "all" ? undefined : filter
      );

      setNotifications(res.data.notifications);
      setTotalPages(res.data.pagination.totalPages);

      await Log(
        "frontend",
        "info",
        "page",
        `Loaded ${res.data.notifications.length} notifications successfully`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
      await Log("frontend", "error", "page", `Failed to load notifications: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  const fetchPriorityNotifications = useCallback(async () => {
    setPriorityLoading(true);
    try {
      await Log(
        "frontend",
        "info",
        "page",
        `Fetching priority inbox: top ${topN}`
      );

      const res = await notificationApi.getPriority(topN);
      setPriorityNotifications(res.data.notifications);

      await Log(
        "frontend",
        "info",
        "page",
        `Loaded ${res.data.notifications.length} priority notifications`
      );
    } catch (err) {
      await Log(
        "frontend",
        "error",
        "page",
        `Failed to load priority notifications: ${err}`
      );
    } finally {
      setPriorityLoading(false);
    }
  }, [topN]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silent fail for count
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (activeTab === "priority") {
      fetchPriorityNotifications();
    }
  }, [activeTab, fetchPriorityNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await Log("frontend", "info", "page", `Marked notification ${id} as read`);
    } catch (err) {
      await Log(
        "frontend",
        "error",
        "page",
        `Failed to mark notification as read: ${err}`
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await Log("frontend", "info", "page", "Marked all notifications as read");
    } catch (err) {
      await Log(
        "frontend",
        "error",
        "page",
        `Failed to mark all notifications as read: ${err}`
      );
    }
  };

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "💼 Placement", value: "Placement" },
    { label: "📊 Result", value: "Result" },
    { label: "📅 Event", value: "Event" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 1.5rem",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.5rem" }}>🔔</span>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#1e293b",
                }}
              >
                Campus Notifications
              </h1>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>
                Placements · Events · Results
              </p>
            </div>
          </div>

          {/* Unread badge */}
          {unreadCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "2px 10px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}
              >
                {unreadCount} unread
              </span>
              <button
                onClick={handleMarkAllRead}
                style={{
                  fontSize: "0.8rem",
                  color: "#2563eb",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  textDecoration: "underline",
                }}
              >
                Mark all read
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "1.5rem",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            background: "#f1f5f9",
            borderRadius: "10px",
            padding: "4px",
            marginBottom: "1.5rem",
            width: "fit-content",
          }}
        >
          {(
            [
              { key: "all", label: "📋 All Notifications" },
              { key: "priority", label: "⚡ Priority Inbox" },
            ] as { key: TabType; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.88rem",
                fontWeight: activeTab === tab.key ? 600 : 400,
                background: activeTab === tab.key ? "#fff" : "transparent",
                color: activeTab === tab.key ? "#1e293b" : "#64748b",
                boxShadow:
                  activeTab === tab.key
                    ? "0 1px 4px rgba(0,0,0,0.08)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* All Notifications Tab */}
        {activeTab === "all" && (
          <>
            {/* Filter buttons */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              {filterButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => {
                    setFilter(btn.value);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    border: "1.5px solid",
                    borderColor: filter === btn.value ? "#2563eb" : "#e2e8f0",
                    background: filter === btn.value ? "#eff6ff" : "#fff",
                    color: filter === btn.value ? "#2563eb" : "#64748b",
                    fontSize: "0.82rem",
                    fontWeight: filter === btn.value ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            {error ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "#ef4444",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  ⚠️
                </div>
                {error}
                <br />
                <button
                  onClick={fetchNotifications}
                  style={{
                    marginTop: "1rem",
                    padding: "8px 16px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: "80px",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      animation: "pulse 1.5s infinite",
                    }}
                  />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "4rem",
                  color: "#94a3b8",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>
                  📭
                </div>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  No notifications found
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
                  Check back later for updates
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {notifications.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "1.5rem",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.5 : 1,
                    fontSize: "0.85rem",
                  }}
                >
                  ← Previous
                </button>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    opacity: page === totalPages ? 0.5 : 1,
                    fontSize: "0.85rem",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Priority Tab */}
        {activeTab === "priority" && (
          <PriorityInbox
            notifications={priorityNotifications}
            loading={priorityLoading}
            topN={topN}
            onTopNChange={(n) => {
              setTopN(n);
            }}
          />
        )}
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
