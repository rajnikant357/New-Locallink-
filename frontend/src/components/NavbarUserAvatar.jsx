import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

export default function NavbarUserAvatar({ name }) {
  const { user } = useAuth();
  const initials = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const imageUrl = user?.profileImageUrl;

  return (
    <Avatar className="h-7 w-7">
      <AvatarImage src={imageUrl} alt={name} />
      <AvatarFallback className="text-lg">{initials}</AvatarFallback>
    </Avatar>
  );
}
