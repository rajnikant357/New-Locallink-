import { useEffect, useRef, useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const ChatbotButton = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const send = async () => {
    const text = message.trim();
    if (!text || sending) return;
    setMessage("");
    setHistory((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    try {
      const res = await api("/support/ask", {
        method: "POST",
        body: JSON.stringify({ question: text }),
      });
      setHistory((prev) => [...prev, { role: "assistant", text: res.answer }]);
    } catch (err) {
      setHistory((prev) => [...prev, { role: "assistant", text: err?.message || "Sorry, I couldn't answer." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 shadow-lg"
        aria-label="Open support chat"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Help</span>
      </button>
      {open ? (
        <div className="fixed bottom-16 right-4 z-50 w-[360px] max-w-[95vw] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-primary text-primary-foreground flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              LocalLink Assistant
            </span>
            <button onClick={() => setOpen(false)} className="text-primary-foreground/80 hover:text-white text-lg">
              ×
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto text-sm">
            {history.length === 0 ? (
              <p className="text-muted-foreground">Ask about login, providers, bookings, Hurry Mode, or using the app.</p>
            ) : (
              history.map((entry, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-2 rounded-lg ${entry.role === "user" ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"}`}
                >
                  {entry.text}
                </div>
              ))
            )}
            {sending ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking…
              </div>
            ) : null}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              placeholder="Ask about LocalLink..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button
              onClick={send}
              disabled={sending}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default ChatbotButton;
