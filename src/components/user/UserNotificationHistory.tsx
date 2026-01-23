import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
}

interface UserNotificationHistoryProps {
  notifications: NotificationLog[];
}

export function UserNotificationHistory({ notifications }: UserNotificationHistoryProps) {
  const getStatusBadge = (status: string, openedAt: string | null) => {
    if (openedAt) {
      return (
        <Badge className="bg-cgi-success/20 text-cgi-success border-cgi-success/30">
          <Eye className="h-3 w-3 mr-1" />
          Megnyitva
        </Badge>
      );
    }

    switch (status) {
      case "sent":
      case "delivered":
        return (
          <Badge className="bg-cgi-secondary/20 text-cgi-secondary border-cgi-secondary/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Kézbesítve
          </Badge>
        );
      case "queued":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Várakozik
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-cgi-error/20 text-cgi-error border-cgi-error/30">
            <XCircle className="h-3 w-3 mr-1" />
            Sikertelen
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-cgi-muted-foreground">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="cgi-card">
      <CardHeader>
        <CardTitle className="text-cgi-surface-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-cgi-primary" />
          Értesítési előzmények
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-cgi-muted-foreground">
            Még nem küldtünk értesítést ennek a felhasználónak
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="p-4 rounded-lg bg-cgi-muted/20 border border-cgi-muted/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-cgi-surface-foreground truncate">
                      {notification.title}
                    </h4>
                    <p className="text-sm text-cgi-muted-foreground mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-cgi-muted-foreground mt-2">
                      {format(new Date(notification.sent_at), "yyyy. MMM d. HH:mm", { locale: hu })}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(notification.status, notification.opened_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}