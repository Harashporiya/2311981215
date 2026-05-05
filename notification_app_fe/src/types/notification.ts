export type NotificationType = "Placement" | "Event" | "Result";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface PriorityNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  priorityScore: number;
  isRead?: boolean;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: PaginationInfo;
  };
}

export interface PriorityNotificationsResponse {
  success: boolean;
  data: {
    notifications: PriorityNotification[];
    count: number;
    requestedN: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}
