import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SessionCardProps {
  sessionId: string;
  date: string;
  duration: string;
  type: string;
  status: "completed" | "in-progress";
}

export const SessionCard = ({ sessionId, date, duration, type, status }: SessionCardProps) => {
  const navigate = useNavigate();
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    if (status === "completed") {
      loadScore();
    }
  }, [sessionId, status]);

  const loadScore = async () => {
    const { data } = await supabase
      .from("interview_responses")
      .select("score")
      .eq("session_id", sessionId);

    if (data && data.length > 0) {
      const avgScore = Math.round(
        data.reduce((sum, r) => sum + (r.score || 0), 0) / data.length
      );
      setScore(avgScore);
    }
  };

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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/results?session=${sessionId}`)}
          >
            View Details
          </Button>
        </div>
      )}
      
      {status === "in-progress" && (
        <Button 
          className="w-full gradient-primary text-white"
          onClick={() => navigate(`/interview?session=${sessionId}`)}
        >
          Continue Session
        </Button>
      )}
    </Card>
  );
};
