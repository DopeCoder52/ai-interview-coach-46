import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp } from "lucide-react";

interface SessionCardProps {
  date: string;
  duration: string;
  type: string;
  score: number;
  status: "completed" | "in-progress";
}

export const SessionCard = ({ date, duration, type, score, status }: SessionCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent";
    return "text-destructive";
  };

  return (
    <Card className="gradient-card shadow-soft hover:shadow-medium transition-smooth p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground mb-2">{type}</h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{duration}</span>
            </div>
          </div>
        </div>
        <Badge variant={status === "completed" ? "default" : "secondary"}>
          {status === "completed" ? "Completed" : "In Progress"}
        </Badge>
      </div>
      
      {status === "completed" && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Overall Score:</span>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}%</span>
          </div>
          <Button variant="outline" size="sm">View Details</Button>
        </div>
      )}
      
      {status === "in-progress" && (
        <Button className="w-full gradient-primary text-white">Continue Session</Button>
      )}
    </Card>
  );
};
