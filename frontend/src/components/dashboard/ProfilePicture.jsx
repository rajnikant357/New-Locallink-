import { useRef, useState, useEffect } from "react";
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const ProfilePicture = ({ name, editable = false }) => {
  const { user, updateCurrentUser } = useAuth();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const [imageUrl, setImageUrl] = useState(user?.profileImageUrl);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setImageUrl(user?.profileImageUrl);
  }, [user?.profileImageUrl]);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result;
        if (typeof url === "string") {
          setImageUrl(url);
          api("/users/me", {
            method: "PATCH",
            body: JSON.stringify({ profileImageUrl: url }),
          })
            .then((response) => {
              updateCurrentUser(response.user || user);
            })
            .catch(() => {
              // revert on failure
              setImageUrl(user?.profileImageUrl);
              toast({
                title: "Upload failed",
                description: "Could not update profile picture. Try a smaller image.",
                variant: "destructive",
              });
            })
            .finally(() => {
              setUploading(false);
            });
        }
      };
      reader.readAsDataURL(file);
    } else {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative inline-block">
      <Avatar className="h-24 w-24 cursor-pointer" onClick={editable && !uploading ? triggerFileInput : undefined}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
      </Avatar>
      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full z-20 border-2 border-white shadow-md"
            style={{ transform: 'translate(25%, 25%)' }}
            onClick={triggerFileInput}
            disabled={uploading}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export default ProfilePicture;
