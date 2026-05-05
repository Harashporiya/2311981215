"use client";

import { PriorityNotification } from "@/types/notification";

interface PriorityInboxProps {
  notifications: PriorityNotification[];
  loading: boolean;
  topN: number;
  onTopNChange: (n: number) => void;
}

const typeColors: Record<string, { bg: string; text: string; icon: string }> = {
  Placement: { bg: "#dcfce7", text: "#166534", icon: "💼" },
  Result: { bg: "#dbeafe", text: "#1e40af", icon: "📊" },
  Event: { bg: "#fef3c7", text: "#92400e", icon: "📅" },
};

function PriorityBar({ score }: { score: number }) {
  const width = Math.min(100, Math.max(0, score));
  const color =
    score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "4px",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "4px",
          background: "#e2e8f0",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${width}%`,
            height: "100%",
            background: color,
            borderRadius: "2px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span style={{ fontSize: "0.7rem", color: "#64748b", minWidth: "32px" }}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export default function PriorityInbox({
  notifications,
  loading,
  topN,
  onTopNChange,
}: PriorityInboxProps) {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "#1e293b",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ⚡ Priority Inbox
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
            Sorted by: type weight × 40 + recency × 40 + unread × 20
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label
            style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}
          >
            Show top:
          </label>
          <select
            value={topN}
            onChange={(e) => onTopNChange(Number(e.target.value))}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              fontSize: "0.85rem",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification list */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          Loading priority notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#94a3b8",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
          No notifications found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {notifications.map((n, idx) => {
            const config = typeColors[n.type] || typeColors.Event;
            return (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  background: "#fff",
                  borderRadius: "10px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #f1f5f9",
                  alignItems: "flex-start",
                }}
              >
                {/* Rank */}
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    color: idx < 3 ? "#f59e0b" : "#94a3b8",
                    minWidth: "24px",
                    paddingTop: "2px",
                  }}
                >
                  #{idx + 1}
                </div>

                {/* Type icon */}
                <span style={{ fontSize: "1.25rem" }}>{config.icon}</span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "2px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: config.text,
                        background: config.bg,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {n.type}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {new Date(n.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    {n.message}
                  </p>
                  <PriorityBar score={n.priorityScore} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
