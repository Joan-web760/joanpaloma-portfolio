"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const STORAGE_KEY = "adminContactLastSeenAt";
const CONTACT_ROUTE = "/admin/contact";
const TOAST_TIMEOUT_MS = 5200;
const DROPDOWN_LIMIT = 6;

const formatDate = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
};

const formatSnippet = (value, maxLen = 140) => {
  const raw = (value || "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, Math.max(0, maxLen - 3))}...`;
};

export default function AdminNotificationBell({ className = "", showLabel = false }) {
  const router = useRouter();
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(null);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownMessages, setDropdownMessages] = useState([]);
  const [dropdownError, setDropdownError] = useState("");

  const mountedRef = useRef(true);
  const lastSeenRef = useRef(null);
  const toastTimerRef = useRef(null);
  const dropdownRef = useRef(null);

  const setLastSeen = useCallback((isoValue) => {
    const nextValue = isoValue || new Date().toISOString();
    lastSeenRef.current = nextValue;
    setLastSeenAt(nextValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextValue);
    }
  }, []);

  const refreshCount = useCallback(async (since) => {
    try {
      const sinceValue = typeof since === "string" ? since : lastSeenRef.current;
      let query = supabase.from("contact_messages").select("*", { count: "exact", head: true });
      if (sinceValue) query = query.gt("created_at", sinceValue);
      const { count, error } = await query;
      if (!mountedRef.current || error) return;
      setUnreadCount(count || 0);
    } catch {
      // ignore background refresh errors
    }
  }, []);

  const fetchDropdownMessages = useCallback(async () => {
    setDropdownLoading(true);
    setDropdownError("");
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(DROPDOWN_LIMIT);
      if (error) throw error;
      if (!mountedRef.current) return;
      setDropdownMessages(data || []);
    } catch (err) {
      if (!mountedRef.current) return;
      setDropdownError(err?.message || "Failed to load notifications.");
    } finally {
      if (!mountedRef.current) return;
      setDropdownLoading(false);
    }
  }, []);

  const showToast = useCallback((message) => {
    if (!message) return;
    setToastMessage(message);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, TOAST_TIMEOUT_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastVisible(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === "undefined") return () => {};

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      lastSeenRef.current = stored;
      setLastSeenAt(stored);
    }
    setReady(true);
    refreshCount(stored);

    return () => {
      mountedRef.current = false;
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!ready) return;
    if (pathname && pathname.startsWith(CONTACT_ROUTE)) {
      setLastSeen();
      setUnreadCount(0);
      return;
    }
    refreshCount();
  }, [pathname, ready, refreshCount, setLastSeen]);

  useEffect(() => {
    if (!ready) return;

    const channel = supabase
      .channel("admin-contact-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contact_messages" },
        (payload) => {
          if (!mountedRef.current) return;
          const isOnContact = pathname && pathname.startsWith(CONTACT_ROUTE);
          if (payload?.new && dropdownOpen) {
            setDropdownMessages((current) => {
              const exists = current.some((row) => row.id === payload.new.id);
              if (exists) return current;
              return [payload.new, ...current].slice(0, DROPDOWN_LIMIT);
            });
          } else if (!isOnContact) {
            showToast(payload?.new);
          }
          refreshCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, ready, refreshCount, showToast, dropdownOpen]);

  useEffect(() => {
    if (!ready) return;
    const intervalId = setInterval(() => {
      refreshCount();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [ready, refreshCount]);

  useEffect(() => {
    if (!toastMessage) return;
    if (toastVisible) return;
    const t = window.setTimeout(() => setToastMessage(null), 200);
    return () => window.clearTimeout(t);
  }, [toastMessage, toastVisible]);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClick = (event) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target)) return;
      setDropdownOpen(false);
    };

    const handleKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (dropdownOpen) return;
    setDropdownError("");
  }, [dropdownOpen]);

  const handleBellClick = () => {
    setDropdownOpen((open) => {
      const next = !open;
      if (next) fetchDropdownMessages();
      return next;
    });
  };

  const handleToastClick = () => {
    dismissToast();
    setLastSeen();
    setUnreadCount(0);
    router.push(CONTACT_ROUTE);
  };

  const handleMessageClick = () => {
    setLastSeen();
    setUnreadCount(0);
    setDropdownOpen(false);
    router.push(CONTACT_ROUTE);
  };

  const label =
    unreadCount > 0
      ? `Inbox, ${unreadCount} new message${unreadCount === 1 ? "" : "s"}`
      : "Inbox";

  const buttonClassName = [
    "btn",
    "btn-outline-secondary",
    "btn-sm",
    "admin-bell",
    unreadCount ? "has-unread" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const emptyCopy = "No notifications yet. You'll see new contact messages here.";

  return (
    <>
      <div className="admin-notify-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className={buttonClassName}
          onClick={handleBellClick}
          aria-label={label}
          title={label}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          <i className="fa-solid fa-bell" aria-hidden="true"></i>
          {showLabel ? <span>Inbox</span> : null}
          {unreadCount > 0 ? <span className="admin-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </button>

        {dropdownOpen ? (
          <div className="admin-notify-panel" role="menu">
            <div className="admin-notify-panel-header">Notifications</div>
            <div className="admin-notify-panel-body">
              {dropdownError ? (
                <div className="admin-notify-empty">{dropdownError}</div>
              ) : dropdownLoading ? (
                <div className="admin-notify-loading">
                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                  Loading...
                </div>
              ) : !dropdownMessages.length ? (
                <div className="admin-notify-empty">{emptyCopy}</div>
              ) : (
                <div className="admin-notify-list">
                  {dropdownMessages.map((message) => {
                    const isNew = lastSeenAt ? new Date(message.created_at) > new Date(lastSeenAt) : true;
                    const headline = message.subject || `Message from ${message.name || "Anonymous"}`;
                    return (
                      <button
                        key={message.id}
                        type="button"
                        className="admin-notify-item"
                        onClick={handleMessageClick}
                      >
                        <div className="admin-notify-item-header">
                          <span className="admin-notify-item-title">{headline}</span>
                          {isNew ? <span className="admin-notify-new">New</span> : null}
                        </div>
                        <div className="admin-notify-item-meta">
                          {message.name || "Anonymous"}
                          {message.email ? ` - ${message.email}` : ""}
                        </div>
                        <div className="admin-notify-item-snippet">
                          {formatSnippet(message.message, 90) || "Message received."}
                        </div>
                        <div className="admin-notify-item-time">{formatDate(message.created_at)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="admin-notify-panel-footer">
              <button type="button" className="admin-notify-viewall" onClick={handleMessageClick}>
                View all
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {toastMessage ? (
        <div className={`admin-notify-toast ${toastVisible ? "show" : ""}`} role="status" aria-live="polite">
          <div className="admin-notify-toast-header">
            <span>New contact message</span>
            <button type="button" className="admin-notify-toast-close" onClick={dismissToast} aria-label="Dismiss">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div className="admin-notify-toast-body">
            <div className="admin-notify-toast-meta">
              {toastMessage.name || "Anonymous"}
              {toastMessage.email ? ` - ${toastMessage.email}` : ""}
            </div>
            {toastMessage.subject ? (
              <div className="admin-notify-toast-subject">Subject: {toastMessage.subject}</div>
            ) : null}
            <div className="admin-notify-toast-snippet">
              {formatSnippet(toastMessage.message, 140) || "Message received."}
            </div>
          </div>
          <div className="admin-notify-toast-actions">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleToastClick}>
              View message
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
