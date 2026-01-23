import { useNavigate } from "react-router-dom";
import { User, MapPin, Wine } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileTooltip } from "./mobile-tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

type EntitySize = "xs" | "sm" | "md" | "lg";

interface UserLinkProps {
  userId: string;
  userName?: string;
  showAvatar?: boolean;
  avatarUrl?: string;
  size?: EntitySize;
  className?: string;
  showTooltip?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function UserLink({
  userId,
  userName = "Felhasználó",
  showAvatar = false,
  avatarUrl,
  size = "md",
  className,
  showTooltip = true,
  onClick,
}: UserLinkProps) {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-sm",
    lg: "text-base font-medium",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4",
  };

  const avatarSizes = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else {
      navigate(`/users/${userId}`);
    }
  };

  const content = (
    <span
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-cgi-primary hover:text-cgi-primary/80",
        "cursor-pointer hover:underline transition-colors",
        sizeClasses[size],
        className
      )}
    >
      {showAvatar ? (
        <Avatar className={avatarSizes[size]}>
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="text-[8px] bg-cgi-primary/20 text-cgi-primary">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <User className={iconSizes[size]} />
      )}
      {userName}
    </span>
  );

  if (showTooltip) {
    return (
      <MobileTooltip content="Kattints a felhasználó profiljához">
        {content}
      </MobileTooltip>
    );
  }

  return content;
}

interface VenueLinkProps {
  venueId: string;
  venueName?: string;
  showIcon?: boolean;
  size?: EntitySize;
  className?: string;
  showTooltip?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function VenueLink({
  venueId,
  venueName = "Helyszín",
  showIcon = true,
  size = "md",
  className,
  showTooltip = true,
  onClick,
}: VenueLinkProps) {
  const navigate = useNavigate();

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-sm",
    lg: "text-base font-medium",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else {
      navigate(`/venues/${venueId}`);
    }
  };

  const content = (
    <span
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-cgi-secondary hover:text-cgi-secondary/80",
        "cursor-pointer hover:underline transition-colors",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <MapPin className={iconSizes[size]} />}
      {venueName}
    </span>
  );

  if (showTooltip) {
    return (
      <MobileTooltip content="Kattints a helyszín oldalához">
        {content}
      </MobileTooltip>
    );
  }

  return content;
}

interface DrinkLinkProps {
  drinkId?: string;
  drinkName: string;
  showIcon?: boolean;
  size?: EntitySize;
  className?: string;
  showTooltip?: boolean;
}

export function DrinkLink({
  drinkId,
  drinkName,
  showIcon = true,
  size = "md",
  className,
  showTooltip = false,
}: DrinkLinkProps) {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-sm",
    lg: "text-base font-medium",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-4 w-4",
  };

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-cgi-surface-foreground",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Wine className={cn(iconSizes[size], "text-cgi-primary")} />}
      {drinkName}
    </span>
  );

  if (showTooltip) {
    return (
      <MobileTooltip content={`Ital: ${drinkName}`}>
        {content}
      </MobileTooltip>
    );
  }

  return content;
}
