import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
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
            Átvéve
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
      case "no_token":
        return (
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">
            <BellOff className="h-3 w-3 mr-1" />
            Nincs aktív eszköz
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

  const deliveredCount = notifications.filter((notification) =>
    notification.opened_at || ["sent", "delivered"].includes(notification.status)
  ).length;
  const noTokenCount = notifications.filter((notification) => notification.status === "no_token").length;
  const failedCount = notifications.filter((notification) => notification.status === "failed").length;

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
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2" aria-label="Értesítési összesítés">
              <div className="rounded-lg border border-cgi-success/20 bg-cgi-success/10 p-3">
                <p className="text-xl font-semibold text-cgi-success">{deliveredCount}</p>
                <p className="text-xs text-cgi-muted-foreground">Átvéve</p>
              </div>
              <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-3">
                <p className="text-xl font-semibold text-orange-300">{noTokenCount}</p>
                <p className="text-xs text-cgi-muted-foreground">Token nélkül</p>
              </div>
              <div className="rounded-lg border border-cgi-error/20 bg-cgi-error/10 p-3">
                <p className="text-xl font-semibold text-cgi-error">{failedCount}</p>
                <p className="text-xs text-cgi-muted-foreground">Sikertelen</p>
              </div>
            </div>

            {noTokenCount > 0 && (
              <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm">
                <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                <div>
                  <p className="font-medium text-orange-200">A legutóbbi küldés nem jutott el eszközre.</p>
                  <p className="mt-1 text-cgi-muted-foreground">
                    A felhasználónak meg kell nyitnia az appot, be kell jelentkeznie és engedélyeznie kell az értesítéseket. Ezután új push-token regisztrálódik.
                  </p>
                </div>
              </div>
            )}

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
