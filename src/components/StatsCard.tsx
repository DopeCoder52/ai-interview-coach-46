import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  description?: string;
}

export const StatsCard = ({ title, value, icon: Icon, trend, description }: StatsCardProps) => {
  return (
    <Card className="gradient-card shadow-soft hover:shadow-medium transition-smooth p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p className="text-xs font-medium text-success mt-2">{trend}</p>
          )}
        </div>
        <div className="gradient-primary rounded-xl p-3 shadow-soft">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  );
};
