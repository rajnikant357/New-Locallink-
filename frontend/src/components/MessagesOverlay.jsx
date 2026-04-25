import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";

const MessagesOverlay = ({ open, onClose, zIndex = 100 }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const openMessages = () => {
    navigate("/messages");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 md:bg-transparent"
      style={{ minHeight: "100vh", zIndex }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-[100vw] h-[100vh] md:w-[420px] md:h-auto md:rounded-2xl md:shadow-2xl bg-background flex items-center justify-center md:fixed md:top-8 md:right-8"
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
        onClick={(event) => event.stopPropagation()}
      >
        <Card className="w-full h-full rounded-none shadow-none md:w-[420px] md:h-auto md:rounded-2xl md:shadow-2xl bg-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              Messages
              <button
                type="button"
                onClick={onClose}
                className="ml-auto text-muted-foreground hover:text-primary text-xl font-bold"
              >
                X
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Open the live inbox to continue conversations, send messages, and track replies in real time.
            </p>
            <div className="flex gap-2">
              <Button onClick={openMessages} className="flex-1">
                Open Messages
              </Button>
              <Button variant="outline" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagesOverlay;
