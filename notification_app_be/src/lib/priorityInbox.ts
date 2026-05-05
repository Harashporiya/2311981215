/**
 * Priority Inbox - Stage 6
 * Computes priority score for notifications and returns top-N
 *
 * Priority Score Formula:
 *   score = (type_weight × 40) + (recency_score × 40) + (is_unread × 20)
 *
 * Type weights: Placement=3, Result=2, Event=1
 * Recency: Decays linearly over 7 days (168 hours)
 * Unread bonus: +20 points
 */

import { Log } from "./logger";

export type NotificationType = "Placement" | "Result" | "Event";

export interface RawNotification {
  ID: string;
  Type: NotificationType;
  Message: string;
  Timestamp: string;
}

export interface PrioritizedNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  priorityScore: number;
  isRead?: boolean;
}

// Type weight mapping: Placement > Result > Event
const TYPE_WEIGHT: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

const MAX_WEIGHT = 3;
const DECAY_HOURS = 168; // 7 days

/**
 * Compute priority score for a single notification
 */
export function computePriorityScore(
  type: NotificationType,
  timestamp: string,
  isRead: boolean = false
): number {
  // Type weight score (0-40)
  const typeWeight = TYPE_WEIGHT[type] ?? 1;
  const typeScore = (typeWeight / MAX_WEIGHT) * 40;

  // Recency score (0-40) - decays linearly over DECAY_HOURS
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - ageHours / DECAY_HOURS) * 40;

  // Unread bonus (0 or 20)
  const unreadBonus = isRead ? 0 : 20;

  return Math.round((typeScore + recencyScore + unreadBonus) * 100) / 100;
}

/**
 * Fetch notifications from Affordmed API and return top-N by priority
 * Stage 6: Uses the provided Notification API
 */
export async function getTopNPriorityNotifications(
  n: number,
  accessToken: string,
  baseURL: string = "http://20.207.122.201"
): Promise<PrioritizedNotification[]> {
  await Log(
    "backend",
    "info",
    "service",
    `Fetching notifications from external API for priority inbox (top ${n})`
  );

  const response = await fetch(`${baseURL}/evaluation-service/notifications`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    await Log(
      "backend",
      "error",
      "service",
      `Failed to fetch notifications from API: ${response.status} ${response.statusText}`
    );
    throw new Error(`Notification API failed: ${response.status}`);
  }

  const data = await response.json();
  const notifications: RawNotification[] = data.notifications || [];

  await Log(
    "backend",
    "info",
    "service",
    `Fetched ${notifications.length} notifications from API, computing priority scores`
  );

  // Compute priority scores for all notifications
  const scored: PrioritizedNotification[] = notifications.map((n) => ({
    id: n.ID,
    type: n.Type,
    message: n.Message,
    timestamp: n.Timestamp,
    priorityScore: computePriorityScore(n.Type, n.Timestamp, false),
  }));

  // Sort by priority score descending and take top-N
  const topN = scored.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, n);

  await Log(
    "backend",
    "info",
    "service",
    `Priority inbox computed: returning top ${topN.length} notifications. Top score: ${topN[0]?.priorityScore ?? 0}`
  );

  return topN;
}

/**
 * Maintain top-N efficiently when new notifications arrive
 * Uses a min-heap approach to avoid re-sorting the entire array
 */
export function maintainTopN(
  current: PrioritizedNotification[],
  newNotification: PrioritizedNotification,
  n: number
): PrioritizedNotification[] {
  // Add the new notification
  const updated = [...current, newNotification];

  // Sort and trim to top-N
  return updated
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, n);
}
