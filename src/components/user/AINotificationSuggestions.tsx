import { NotificationRecommendations } from '@/components/NotificationRecommendations';

export function AINotificationSuggestions({ userId, onSend }: { userId: string; userName: string; onSend?: () => void }) {
  return <NotificationRecommendations userId={userId} onScheduled={onSend} />;
}
