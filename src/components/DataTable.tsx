
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Filter, Info } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  tooltip?: string;
  priority?: 'high' | 'medium' | 'low'; // for mobile display priority
  mobileLabel?: string; // custom label for mobile view
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  className?: string;
  mobileCardRender?: (item: T, index: number) => React.ReactNode; // custom mobile card renderer
}

export function DataTable<T extends Record<string, any>>({ 
  data, 
  columns, 
  searchPlaceholder = "Keresés...",
  className = "",
  mobileCardRender
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobile();
  
  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Get high priority columns for mobile display
  const mobileColumns = columns.filter(col => col.priority === 'high' || !col.priority).slice(0, 3);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cgi-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cgi-input pl-10"
          />
        </div>
        <Button variant="outline" size="sm" className="cgi-button-secondary w-full sm:w-auto">
          <Filter className="h-4 w-4 mr-2" />
          Szűrők
        </Button>
      </div>
      
      {isMobile ? (
        // Mobile Card View
        <div className="space-y-4">
          {filteredData.length === 0 ? (
            <Card className="cgi-card">
              <CardContent className="text-center py-8 text-cgi-muted-foreground">
                Nincsenek találatok
              </CardContent>
            </Card>
          ) : (
            filteredData.map((item, index) => (
              mobileCardRender ? (
                mobileCardRender(item, index)
              ) : (
                <Card key={index} className="cgi-card">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {mobileColumns.map((column) => (
                        <div key={String(column.key)} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-cgi-muted-foreground">
                              {column.mobileLabel || column.label}:
                            </span>
                            {column.tooltip && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-cgi-muted-foreground hover:text-cgi-surface-foreground cursor-help transition-colors" />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-sm">{column.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <div className="text-sm">
                            {column.render 
                              ? column.render(item[column.key], item)
                              : String(item[column.key])
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            ))
          )}
        </div>
      ) : (
        // Desktop Table View
        <div className="rounded-lg border border-cgi-muted bg-cgi-surface overflow-x-auto">
          <table className="cgi-table w-full">
            <thead className="cgi-table-header">
              <tr>
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className="h-12 px-4 text-left align-middle font-medium text-cgi-muted-foreground whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.tooltip && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-cgi-muted-foreground hover:text-cgi-surface-foreground cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-sm">{column.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="cgi-table-body">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="h-24 px-4 text-center text-cgi-muted-foreground">
                    Nincsenek találatok
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index} className="cgi-table-row">
                    {columns.map((column) => (
                      <td key={String(column.key)} className="px-4 py-3 align-middle">
                        {column.render 
                          ? column.render(item[column.key], item)
                          : String(item[column.key])
                        }
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
