import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { MobileTooltip } from "@/components/ui/mobile-tooltip";

interface ExportOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface ExportDropdownProps {
  options: ExportOption[];
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  tooltipContent?: string;
}

export function ExportDropdown({
  options,
  disabled = false,
  variant = "outline",
  size = "default",
  className,
  tooltipContent = "Adatok exportálása CSV formátumban"
}: ExportDropdownProps) {
  const button = (
    <Button variant={variant} size={size} disabled={disabled} className={className}>
      <Download className="h-4 w-4" />
      {size !== "icon" && <span className="ml-2">Export</span>}
    </Button>
  );

  // If only one option, make it a direct button
  if (options.length === 1) {
    return (
      <MobileTooltip content={tooltipContent}>
        <Button
          variant={variant}
          size={size}
          disabled={disabled}
          onClick={options[0].onClick}
          className={className}
        >
          <Download className="h-4 w-4" />
          {size !== "icon" && <span className="ml-2">Export</span>}
        </Button>
      </MobileTooltip>
    );
  }

  return (
    <DropdownMenu>
      <MobileTooltip content={tooltipContent}>
        <DropdownMenuTrigger asChild>
          {button}
        </DropdownMenuTrigger>
      </MobileTooltip>
      <DropdownMenuContent align="end" className="w-48">
        {options.map((option, index) => (
          <DropdownMenuItem
            key={index}
            onClick={option.onClick}
            className="cursor-pointer"
          >
            {option.icon || <FileSpreadsheet className="h-4 w-4 mr-2" />}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Pre-configured export icons
export const ExportIcons = {
  csv: <FileSpreadsheet className="h-4 w-4 mr-2" />,
  profile: <FileText className="h-4 w-4 mr-2" />,
  list: <FileSpreadsheet className="h-4 w-4 mr-2" />,
};
