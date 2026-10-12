import { useState, useEffect, useCallback, useRef } from "react";
import { User, api } from "./api";

export interface CollabUser {
  userId: string;
  userName: string;
  userRole: string;
  color: string;
  sheetId?: string;
  lastSeen?: number;
}

export interface RemoteCursor {
  userId: string;
  userName: string;
  userRole: string;
  color: string;
  lineId: number;
  field: string;
}

export interface CollabEvent {
  type: "PRESENCE_SYNC" | "CURSOR_MOVE" | "CELL_EDIT" | "ROW_ADD" | "ROW_DELETE";
  sheetId: string;
  userId: string;
  userName: string;
  userRole: string;
  color: string;
  payload: any;
  timestamp?: number;
}

const COLLAB_COLORS = [
  { bg: "#10b981", border: "#059669", light: "#ecfdf5", name: "Emerald" },
  { bg: "#3b82f6", border: "#2563eb", light: "#eff6ff", name: "Blue" },
  { bg: "#8b5cf6", border: "#7c3aed", light: "#f5f3ff", name: "Purple" },
  { bg: "#f59e0b", border: "#d97706", light: "#fffbeb", name: "Amber" },
  { bg: "#ec4899", border: "#db2777", light: "#fdf2f8", name: "Pink" },
  { bg: "#06b6d4", border: "#0891b2", light: "#ecfeff", name: "Cyan" }
];

export function useCollaboration({
  user,
  activeSheet = "jurnal",
  onRemoteCellEdit,
  onRemoteAddRow,
  onRemoteDeleteRow
}: {
  user: User;
  activeSheet?: string;
  onRemoteCellEdit?: (lineId: number, field: string, value: any, actor: string) => void;
  onRemoteAddRow?: (newRow: any, actor: string) => void;
  onRemoteDeleteRow?: (lineId: number, actor: string) => void;
}) {
  const [activeUsers, setActiveUsers] = useState<CollabUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Local user identity & unique color
  const localColor = useRef<typeof COLLAB_COLORS[0]>(
    COLLAB_COLORS[Math.abs((user.id || 1) * 7) % COLLAB_COLORS.length]
  ).current;

  const currentUserId = useRef<string>(`usr-${user.id || Date.now()}`).current;
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Broadcast function to SSE backend + BroadcastChannel
  const broadcastEvent = useCallback((type: CollabEvent["type"], payload: any) => {
    const ev: CollabEvent = {
      type,
      sheetId: activeSheet,
      userId: currentUserId,
      userName: user.name || "Finance Staff",
      userRole: user.role || "Specialist",
      color: localColor.bg,
      payload,
      timestamp: Date.now()
    };

    // 1. Cross-tab BroadcastChannel
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(ev);
      } catch (err) {
        // ignore
      }
    }

    // 2. Server-side API broadcast
    api("/api/accounting/collaboration/broadcast", {
      method: "POST",
      body: JSON.stringify(ev)
    }).catch(() => {
      // ignore network errors if offline
    });
  }, [activeSheet, currentUserId, user, localColor]);

  // Handle incoming event
  const handleIncomingEvent = useCallback((ev: CollabEvent) => {
    if (!ev || ev.userId === currentUserId) return;

    switch (ev.type) {
      case "PRESENCE_SYNC":
        if (Array.isArray(ev.payload)) {
          setActiveUsers(ev.payload.filter((u: any) => u.userId !== currentUserId));
        }
        break;

      case "CURSOR_MOVE":
        if (ev.payload?.lineId) {
          setRemoteCursors((prev) => ({
            ...prev,
            [ev.userId]: {
              userId: ev.userId,
              userName: ev.userName,
              userRole: ev.userRole,
              color: ev.color,
              lineId: ev.payload.lineId,
              field: ev.payload.field
            }
          }));
        }
        break;

      case "CELL_EDIT":
        if (ev.payload?.lineId && ev.payload?.field !== undefined && onRemoteCellEdit) {
          onRemoteCellEdit(ev.payload.lineId, ev.payload.field, ev.payload.value, ev.userName);
        }
        break;

      case "ROW_ADD":
        if (ev.payload?.newRow && onRemoteAddRow) {
          onRemoteAddRow(ev.payload.newRow, ev.userName);
        }
        break;

      case "ROW_DELETE":
        if (ev.payload?.lineId && onRemoteDeleteRow) {
          onRemoteDeleteRow(ev.payload.lineId, ev.userName);
        }
        break;
    }
  }, [currentUserId, onRemoteCellEdit, onRemoteAddRow, onRemoteDeleteRow]);

  // Initialize BroadcastChannel and SSE Connection
  useEffect(() => {
    // 1. Setup BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("feast_accounting_collaboration");
      bc.onmessage = (e) => {
        if (e.data) handleIncomingEvent(e.data);
      };
      broadcastChannelRef.current = bc;
    }

    // 2. Announce presence to other tabs/users
    const announcePresence = () => {
      broadcastEvent("PRESENCE_SYNC", [{
        userId: currentUserId,
        userName: user.name,
        userRole: user.role,
        color: localColor.bg,
        sheetId: activeSheet,
        lastSeen: Date.now()
      }]);
    };

    announcePresence();
    const interval = setInterval(announcePresence, 20000);

    return () => {
      clearInterval(interval);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [broadcastEvent, currentUserId, user, localColor, activeSheet, handleIncomingEvent]);

  // Public helper methods
  const broadcastCursor = useCallback((lineId: number, field: string) => {
    broadcastEvent("CURSOR_MOVE", { lineId, field });
  }, [broadcastEvent]);

  const broadcastCellEdit = useCallback((lineId: number, field: string, value: any) => {
    broadcastEvent("CELL_EDIT", { lineId, field, value });
  }, [broadcastEvent]);

  const broadcastAddRow = useCallback((newRow: any) => {
    broadcastEvent("ROW_ADD", { newRow });
  }, [broadcastEvent]);

  const broadcastDeleteRow = useCallback((lineId: number) => {
    broadcastEvent("ROW_DELETE", { lineId });
  }, [broadcastEvent]);

  return {
    activeUsers,
    remoteCursors,
    isConnected,
    localColor: localColor.bg,
    broadcastCursor,
    broadcastCellEdit,
    broadcastAddRow,
    broadcastDeleteRow
  };
}

