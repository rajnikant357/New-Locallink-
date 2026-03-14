import { Facebook, Globe, Instagram, Linkedin } from "lucide-react";

const socialConfig = [
  { key: "website", label: "Website", icon: Globe },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
];

const SocialLinksRow = ({ socialLinks = {}, size = "sm", className = "" }) => {
  const entries = socialConfig.filter((entry) => socialLinks?.[entry.key]);

  if (entries.length === 0) {
    return null;
  }

  const iconClassName = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";
  const linkClassName =
    size === "lg"
      ? "inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-primary"
      : "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-primary";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      {entries.map(({ key, label, icon: Icon }) => (
        <a
          key={key}
          href={socialLinks[key]}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className={linkClassName}
        >
          <Icon className={iconClassName} />
        </a>
      ))}
    </div>
  );
};

export default SocialLinksRow;
