import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";

interface RecentUser {
  id: string;
  name: string;
  avatar_url?: string | null;
  viewed_at: number;
}

const STORAGE_KEY = "cgi:recent-users";
const MAX = 8;

export function pushRecentUser(u: { id: string; name: string; avatar_url?: string | null }) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: RecentUser[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((x) => x.id !== u.id);
    filtered.unshift({ ...u, viewed_at: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function RecentlyViewedUsersStrip() {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setUsers(raw ? JSON.parse(raw) : []);
    } catch {
      setUsers([]);
    }
  }, []);

  if (users.length === 0) return null;

  const initials = (n: string) =>
    n.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <div className="flex items-center gap-1.5 shrink-0 text-xs text-cgi-muted-foreground pr-1">
        <Clock className="h-3.5 w-3.5" />
        Nemrég nézve
      </div>
      {users.map((u) => (
        <button
          key={u.id}
          onClick={() => navigate(`/users/${u.id}`)}
          className="flex items-center gap-2 shrink-0 rounded-full bg-cgi-muted/30 hover:bg-cgi-muted/60 transition-colors pl-1 pr-3 py-1"
          title={u.name}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={u.avatar_url || undefined} />
            <AvatarFallback className="bg-cgi-secondary/20 text-cgi-secondary text-[10px]">
              {initials(u.name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-cgi-surface-foreground truncate max-w-[120px]">{u.name}</span>
        </button>
      ))}
    </div>
  );
}
