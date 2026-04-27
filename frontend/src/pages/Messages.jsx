import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, MessageSquare, Menu as MenuIcon, X as XIcon } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useRealtimeEvents } from "@/hooks/use-realtime-events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Messages = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [conversations, setConversations] = useState([]);
  const [conversationSearch, setConversationSearch] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false);
  const [showConversationsDrawer, setShowConversationsDrawer] = useState(() => Boolean(location.state?.openConversations) && (typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false));
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardToUserId, setForwardToUserId] = useState("");
  const [forwarding, setForwarding] = useState(false);
  const [unreadByUserId, setUnreadByUserId] = useState({});
  const [unreadMessageIdsByUserId, setUnreadMessageIdsByUserId] = useState({});
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const messageNodeRefs = useRef(new Map());
  const suppressNextBottomScrollRef = useRef(false);
  const markReadInFlightRef = useRef(new Set());

  const closeMessagesOverlay = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      closeMessagesOverlay();
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    let mounted = true;

    const loadConversations = async () => {
      try {
        setLoadingConversations(true);
        const [response, recipientsResponse, unreadResponse] = await Promise.all([
          api("/messages/conversations/me"),
          api("/messages/recipients/me"),
          api("/notifications/me?unreadOnly=true&includeMessage=true"),
        ]);
        if (!mounted) return;

        setConversations(response.conversations || []);
        setRecipientOptions(recipientsResponse.recipients || []);
        const unreadMap = (unreadResponse.notifications || []).reduce((acc, item) => {
          if (item.type === "message" && item.fromUserId) {
            acc[item.fromUserId] = (acc[item.fromUserId] || 0) + 1;
          }
          return acc;
        }, {});
        const unreadIdsMap = (unreadResponse.notifications || []).reduce((acc, item) => {
          if (item.type === "message" && item.fromUserId && item.messageId) {
            acc[item.fromUserId] = [...(acc[item.fromUserId] || []), item.messageId];
          }
          return acc;
        }, {});
        setUnreadByUserId(unreadMap);
        setUnreadMessageIdsByUserId(unreadIdsMap);

        const preselectedId = location.state?.toUserId;
        const preselectedName = location.state?.toUserName;
        const openConversationsOnly = Boolean(location.state?.openConversations);

        if (preselectedId) {
          setSelectedUser({ id: preselectedId, name: preselectedName || "Conversation" });
          return;
        }
        if (!openConversationsOnly && (response.conversations || []).length > 0) {
          setSelectedUser(response.conversations[0].user);
        }
      } catch (err) {
        toast({
          title: "Failed to load messages",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setLoadingConversations(false);
        }
      }
    };

    loadConversations();

    return () => {
      mounted = false;
    };
  }, [authLoading, isAuthenticated, location.state]);

  useEffect(() => {
    // Keep `isMobile` in sync with viewport changes so drawer vs full overlay behaves correctly
    const m = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    if (m.addEventListener) m.addEventListener("change", handler);
    else m.addListener(handler);
    return () => {
      if (m.removeEventListener) m.removeEventListener("change", handler);
      else m.removeListener(handler);
    };
  }, []);

  useEffect(() => {
    if (!selectedUser?.id || authLoading || !isAuthenticated) {
      setMessages([]);
      return;
    }

    let mounted = true;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const response = await api(`/messages/${selectedUser.id}`);
        if (mounted) {
          setMessages(response.messages || []);
        }
      } catch (err) {
        if (mounted) {
          toast({
            title: "Failed to load conversation",
            description: err?.message || "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [selectedUser, authLoading, isAuthenticated]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages]);

  useEffect(() => {
    if (!selectedUser?.id || sortedMessages.length === 0) return;

    const unreadIds = unreadMessageIdsByUserId[selectedUser.id] || [];
    const oldestUnread = sortedMessages.find((message) => unreadIds.includes(message.id));

    if (oldestUnread) {
      const unreadNode = messageNodeRefs.current.get(oldestUnread.id);
      if (unreadNode?.scrollIntoView) {
        unreadNode.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      suppressNextBottomScrollRef.current = true;
      if (!markReadInFlightRef.current.has(selectedUser.id)) {
        markReadInFlightRef.current.add(selectedUser.id);
        api(`/notifications/messages/${selectedUser.id}/read`, { method: "PATCH" })
          .then(() => {
            setUnreadByUserId((prev) => ({ ...prev, [selectedUser.id]: 0 }));
            setUnreadMessageIdsByUserId((prev) => ({ ...prev, [selectedUser.id]: [] }));
          })
          .catch(() => undefined)
          .finally(() => {
            markReadInFlightRef.current.delete(selectedUser.id);
          });
      }
      return;
    }

    if (suppressNextBottomScrollRef.current) {
      suppressNextBottomScrollRef.current = false;
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [sortedMessages, selectedUser?.id, unreadMessageIdsByUserId]);

  useEffect(() => {
    if (selectedUser?.id) {
      messageInputRef.current?.focus();
    }
  }, [selectedUser?.id]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!selectedUser?.id || !messageText.trim() || sending) return;

    try {
      setSending(true);
      const text = messageText.trim();
      setMessageText("");

      const response = await api("/messages", {
        method: "POST",
        body: JSON.stringify({ toUserId: selectedUser.id, text }),
      });

      setMessages((prev) =>
        prev.some((item) => item.id === response.message.id) ? prev : [...prev, response.message],
      );

      setConversations((prev) => {
        const existing = prev.find((item) => item.user?.id === selectedUser.id);
        const updated = {
          user: selectedUser,
          lastMessage: response.message,
        };

        if (existing) {
          return [updated, ...prev.filter((item) => item.user?.id !== selectedUser.id)];
        }

        return [updated, ...prev];
      });

      messageInputRef.current?.focus();
    } catch (err) {
      toast({
        title: "Message failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const startEdit = (message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text || "");
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const saveEdit = async (messageId) => {
    if (!editingText.trim()) return;

    try {
      const response = await api(`/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ text: editingText.trim() }),
      });
      setMessages((prev) => prev.map((item) => (item.id === messageId ? response.message : item)));
      cancelEdit();
      toast({ title: "Message updated", description: "Your message was edited." });
    } catch (err) {
      toast({
        title: "Edit failed",
        description: err?.message || "Could not edit message.",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await api(`/messages/${messageId}`, { method: "DELETE" });
      setMessages((prev) => prev.filter((item) => item.id !== messageId));
      toast({ title: "Message deleted", description: "Message removed." });
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err?.message || "Could not delete message.",
        variant: "destructive",
      });
    }
  };

  const confirmForwardMessage = async () => {
    if (!forwardMessageId || !forwardToUserId) return;
    try {
      setForwarding(true);
      const response = await api(`/messages/${forwardMessageId}/forward`, {
        method: "POST",
        body: JSON.stringify({ toUserId: forwardToUserId }),
      });

      const forwarded = response.message;
      const otherId = forwarded.fromUserId === user?.id ? forwarded.toUserId : forwarded.fromUserId;

      setConversations((prev) => {
        const exists = prev.find((item) => item.user?.id === otherId);
        const fallbackUser = exists?.user || { id: otherId, name: "Conversation" };
        const updated = { user: fallbackUser, lastMessage: forwarded };
        if (exists) {
          return [updated, ...prev.filter((item) => item.user?.id !== otherId)];
        }
        return [updated, ...prev];
      });

      if (selectedUser?.id === otherId) {
        setMessages((prev) => (prev.some((item) => item.id === forwarded.id) ? prev : [...prev, forwarded]));
      }

      setForwardModalOpen(false);
      setForwardMessageId(null);
      setForwardSearch("");
      setForwardToUserId("");
      toast({ title: "Message forwarded", description: "Message sent successfully." });
    } catch (err) {
      toast({
        title: "Forward failed",
        description: err?.message || "Could not forward message.",
        variant: "destructive",
      });
    } finally {
      setForwarding(false);
    }
  };

  const openForwardModal = (messageId) => {
    setForwardMessageId(messageId);
    setForwardToUserId("");
    setForwardSearch("");
    setForwardModalOpen(true);
  };

  const filteredRecipients = useMemo(() => {
    const query = forwardSearch.trim().toLowerCase();
    if (!query) return recipientOptions;
    return recipientOptions.filter((item) => {
      const target = `${item.name || ""} ${item.email || ""} ${item.type || ""}`.toLowerCase();
      return target.includes(query);
    });
  }, [forwardSearch, recipientOptions]);

  useRealtimeEvents((eventName, payload) => {
    if (eventName === "message.updated" && payload?.message) {
      const updated = payload.message;
      setMessages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setConversations((prev) =>
        prev.map((item) =>
          item.lastMessage?.id === updated.id ? { ...item, lastMessage: updated } : item,
        ),
      );
      return;
    }

    if (eventName === "message.deleted" && payload?.id) {
      setMessages((prev) => prev.filter((item) => item.id !== payload.id));
      setConversations((prev) => prev.filter((item) => item.lastMessage?.id !== payload.id));
      return;
    }

    if (eventName === "message.new" && payload?.message) {
      const incoming = payload.message;
      const otherId = incoming.fromUserId === user?.id ? incoming.toUserId : incoming.fromUserId;

      setConversations((prev) => {
        const exists = prev.find((item) => item.user?.id === otherId);
        const fallbackUser =
          exists?.user ||
          (selectedUser?.id === otherId
            ? selectedUser
            : { id: otherId, name: otherId === selectedUser?.id ? selectedUser?.name : "Conversation" });
        const updated = { user: fallbackUser, lastMessage: incoming };
        if (exists) {
          return [updated, ...prev.filter((item) => item.user?.id !== otherId)];
        }
        return [updated, ...prev];
      }, isAuthenticated);

      if (selectedUser?.id === otherId) {
        setMessages((prev) => (prev.some((item) => item.id === incoming.id) ? prev : [...prev, incoming]));
      }
    }

    if (eventName === "notification.new") {
      const notificationType = payload?.notification?.type || payload?.type;
      const fromUserId = payload?.notification?.fromUserId;
      const messageId = payload?.notification?.messageId;
      if (notificationType === "message" && fromUserId) {
        if (selectedUser?.id === fromUserId) {
          if (!markReadInFlightRef.current.has(fromUserId)) {
            markReadInFlightRef.current.add(fromUserId);
            api(`/notifications/messages/${fromUserId}/read`, { method: "PATCH" })
              .catch(() => undefined)
              .finally(() => {
                markReadInFlightRef.current.delete(fromUserId);
              });
          }
          setUnreadByUserId((prev) => ({ ...prev, [fromUserId]: 0 }));
          setUnreadMessageIdsByUserId((prev) => ({ ...prev, [fromUserId]: [] }));
        } else {
          setUnreadByUserId((prev) => ({
            ...prev,
            [fromUserId]: (prev[fromUserId] || 0) + 1,
          }));
          if (messageId) {
            setUnreadMessageIdsByUserId((prev) => ({
              ...prev,
              [fromUserId]: [...(prev[fromUserId] || []), messageId],
            }));
          }
        }
      }
    }

    if (eventName === "notification.updated" && payload?.notification?.type === "message") {
      const fromUserId = payload?.notification?.fromUserId;
      const messageId = payload?.notification?.messageId;
      if (fromUserId) {
        setUnreadByUserId((prev) => ({
          ...prev,
          [fromUserId]: Math.max(0, (prev[fromUserId] || 0) - 1),
        }));
        if (messageId) {
          setUnreadMessageIdsByUserId((prev) => ({
            ...prev,
            [fromUserId]: (prev[fromUserId] || []).filter((id) => id !== messageId),
          }));
        }
      }
    }
  }, isAuthenticated);

  // On mobile, when no conversation is selected (initial open), always render the
  // conversations drawer instead of the full overlay. Selecting a conversation
  // will close the drawer and show the conversation view.
  if (isMobile && !selectedUser) {
    return (
      <div className="absolute inset-0 z-50 md:hidden p-3">
        <div className="w-full h-full bg-background border rounded-lg overflow-auto">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div className="font-semibold">Messages</div>
            </div>
            <button onClick={closeMessagesOverlay} aria-label="Close conversations">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3">
            <Input
              placeholder="Search users or messages..."
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
            />
          </div>
          <div className="p-3">
            {loadingConversations ? (
              Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              (() => {
                const q = conversationSearch.trim().toLowerCase();
                const filtered = q
                  ? conversations.filter((conversation) => {
                      const name = (conversation.user?.name || "").toLowerCase();
                      const last = (conversation.lastMessage?.text || "").toLowerCase();
                      return name.includes(q) || last.includes(q);
                    })
                  : conversations;

                if (filtered.length === 0 && conversationSearch.trim()) {
                  const matches = (recipientOptions || []).filter((r) => `${r.name || ""} ${r.email || ""}`.toLowerCase().includes(conversationSearch.trim().toLowerCase()));
                  if (matches.length > 0) {
                    return matches.map((recipient) => (
                      <button
                        key={recipient.id}
                        className={`w-full text-left p-3 rounded-lg border hover:bg-muted/40 mb-2`}
                        onClick={() => { setSelectedUser({ id: recipient.id, name: recipient.name }); setShowConversationsDrawer(false); }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{recipient.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">Start a new conversation</p>
                      </button>
                    ));
                  }
                }

                return filtered.map((conversation) => (
                  <button
                    key={conversation.user?.id || conversation.lastMessage?.id}
                    className={`w-full text-left p-3 rounded-lg border mb-2 hover:bg-muted/40`}
                    onClick={() => { setSelectedUser(conversation.user); setShowConversationsDrawer(false); }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{conversation.user?.name || "Unknown user"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage?.text || "No messages"}</p>
                  </button>
                ));
              })()
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm p-3 md:p-6"
      style={{ minHeight: "100vh" }}
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        className="w-full max-w-[980px] h-[92vh] md:h-[86vh]"
        style={{ maxHeight: "900px" }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Card className="w-full h-full md:rounded-2xl md:shadow-2xl bg-background grid md:grid-cols-[280px_1fr] min-h-0">
          {/* Conversations panel - visible on md+, hidden on mobile (moved into drawer) */}
          <div className="border-r min-h-0 flex flex-col hidden md:flex">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2 overflow-y-auto min-h-0 flex-1">
              <div className="mb-2">
                <Input
                  placeholder="Search users or messages..."
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                />
              </div>

              {loadingConversations ? (
                Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              ) : (
                <>
                  {(() => {
                    const q = conversationSearch.trim().toLowerCase();
                    const filtered = q
                      ? conversations.filter((conversation) => {
                          const name = (conversation.user?.name || "").toLowerCase();
                          const last = (conversation.lastMessage?.text || "").toLowerCase();
                          return name.includes(q) || last.includes(q);
                        })
                      : conversations;

                    // if no conversations match, show matching recipients to start a new chat
                    if (filtered.length === 0 && conversationSearch.trim()) {
                      const matches = (recipientOptions || []).filter((r) => `${r.name || ""} ${r.email || ""}`.toLowerCase().includes(conversationSearch.trim().toLowerCase()));
                      if (matches.length > 0) {
                        return matches.map((recipient) => (
                          <button
                            key={recipient.id}
                            className={`w-full text-left p-3 rounded-lg border hover:bg-muted/40`}
                            onClick={() => setSelectedUser({ id: recipient.id, name: recipient.name })}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{recipient.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">Start a new conversation</p>
                          </button>
                        ));
                      }
                    }

                    return filtered.map((conversation) => {
                      const isActive = selectedUser?.id === conversation.user?.id;
                      return (
                        <button
                          key={conversation.user?.id || conversation.lastMessage?.id}
                          className={`w-full text-left p-3 rounded-lg border ${isActive ? "bg-primary/10 border-primary/40" : "hover:bg-muted/40"}`}
                          onClick={() => setSelectedUser(conversation.user)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{conversation.user?.name || "Unknown user"}</p>
                            {(unreadByUserId[conversation.user?.id] || 0) > 0 ? (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] leading-[18px] text-center">
                                {unreadByUserId[conversation.user?.id] > 99 ? "99+" : unreadByUserId[conversation.user?.id]}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage?.text || "No messages"}</p>
                        </button>
                      );
                    });
                  })()}
                </>
              )}
            </CardContent>
          </div>

          {/* Mobile drawer for conversations (visible when hamburger is clicked) */}
          {showConversationsDrawer ? (
            <div className="absolute inset-0 z-50 md:hidden p-3">
              <div className="w-full h-full bg-background border rounded-lg overflow-auto">
                <div className="p-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div className="font-semibold">Messages</div>
                  </div>
                  <button onClick={closeMessagesOverlay} aria-label="Close conversations">
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-3">
                  <Input
                    placeholder="Search users or messages..."
                    value={conversationSearch}
                    onChange={(e) => setConversationSearch(e.target.value)}
                  />
                </div>
                <div className="p-3">
                  {loadingConversations ? (
                    Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
                  ) : conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  ) : (
                    (() => {
                      const q = conversationSearch.trim().toLowerCase();
                      const filtered = q
                        ? conversations.filter((conversation) => {
                            const name = (conversation.user?.name || "").toLowerCase();
                            const last = (conversation.lastMessage?.text || "").toLowerCase();
                            return name.includes(q) || last.includes(q);
                          })
                        : conversations;

                      if (filtered.length === 0 && conversationSearch.trim()) {
                        const matches = (recipientOptions || []).filter((r) => `${r.name || ""} ${r.email || ""}`.toLowerCase().includes(conversationSearch.trim().toLowerCase()));
                        if (matches.length > 0) {
                          return matches.map((recipient) => (
                            <button
                              key={recipient.id}
                              className={`w-full text-left p-3 rounded-lg border hover:bg-muted/40 mb-2`}
                              onClick={() => { setSelectedUser({ id: recipient.id, name: recipient.name }); setShowConversationsDrawer(false); }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-medium text-sm">{recipient.name}</p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">Start a new conversation</p>
                            </button>
                          ));
                        }
                      }

                      return filtered.map((conversation) => (
                        <button
                          key={conversation.user?.id || conversation.lastMessage?.id}
                          className={`w-full text-left p-3 rounded-lg border mb-2 hover:bg-muted/40`}
                          onClick={() => { setSelectedUser(conversation.user); setShowConversationsDrawer(false); }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">{conversation.user?.name || "Unknown user"}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conversation.lastMessage?.text || "No messages"}</p>
                        </button>
                      ));
                    })()
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col h-full min-h-0">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between w-full">
                <div className="w-10 flex items-center">
                  <button className="md:hidden" onClick={() => setShowConversationsDrawer(true)} aria-label="Open conversations">
                    <MenuIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 text-center">
                  <CardTitle className="text-base">{selectedUser ? selectedUser.name : "Messages"}</CardTitle>
                </div>

                <div className="w-10 flex items-center justify-end">
                  <button onClick={closeMessagesOverlay} aria-label="Close messages">
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {!selectedUser ? (
                null
              ) : loadingMessages ? (
                Array.from({ length: 4 }).map((_, idx) => <Skeleton key={idx} className="h-14 w-full" />)
              ) : sortedMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
              ) : (
                sortedMessages.map((message) => {
                  const mine = message.fromUserId === user?.id;
                  return (
                    <div
                      key={message.id}
                      ref={(node) => {
                        if (node) {
                          messageNodeRefs.current.set(message.id, node);
                        } else {
                          messageNodeRefs.current.delete(message.id);
                        }
                      }}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`group relative max-w-[75%] px-3 py-2 rounded-xl text-sm break-words whitespace-pre-wrap overflow-hidden ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {editingMessageId === message.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                            />
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                              <Button size="sm" onClick={() => saveEdit(message.id)}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <p>{message.text}</p>
                        )}
                        <p className="text-[10px] mt-1 opacity-70">{new Date(message.createdAt).toLocaleString()}</p>
                        {mine && editingMessageId !== message.id ? (
                          <div className="absolute top-1 right-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7 bg-background/60 hover:bg-background">
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => startEdit(message)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openForwardModal(message.id)}>Forward</DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => deleteMessage(message.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
              <Input
                ref={messageInputRef}
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder={selectedUser ? "Type a message..." : "Select a conversation first"}
                disabled={!selectedUser}
              />
              <Button
                type="submit"
                onMouseDown={(event) => event.preventDefault()}
                disabled={!selectedUser || sending || !messageText.trim()}
              >
                Send
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <Dialog open={forwardModalOpen} onOpenChange={setForwardModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Forward Message</DialogTitle>
            <DialogDescription>Select a user to forward this message to.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Search by name or email..."
              value={forwardSearch}
              onChange={(event) => setForwardSearch(event.target.value)}
            />

            <div className="max-h-64 overflow-y-auto border rounded-md">
              {filteredRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">No matching users found.</p>
              ) : (
                filteredRecipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 ${
                      forwardToUserId === recipient.id ? "bg-primary/10" : ""
                    }`}
                    onClick={() => setForwardToUserId(recipient.id)}
                  >
                    <p className="font-medium text-sm">{recipient.name}</p>
                    <p className="text-xs text-muted-foreground">{recipient.email} | {recipient.type}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setForwardModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmForwardMessage} disabled={!forwardToUserId || forwarding}>
              {forwarding ? "Forwarding..." : "Forward"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default Messages;
