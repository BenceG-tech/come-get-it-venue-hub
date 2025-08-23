
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimeRangeInputProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  startLabel?: string;
  endLabel?: string;
}

export function TimeRangeInput({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startLabel = "Kezdési idő",
  endLabel = "Befejezési idő"
}: TimeRangeInputProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-cgi-surface-foreground">{startLabel}</Label>
        <Input
          type="time"
          value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          className="cgi-input"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-cgi-surface-foreground">{endLabel}</Label>
        <Input
          type="time"
          value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
          className="cgi-input"
        />
      </div>
    </div>
  );
}
