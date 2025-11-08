import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface InterviewTypeCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  duration: string;
  questions: number;
  onStart: () => void;
}

export const InterviewTypeCard = ({
  title,
  description,
  icon: Icon,
  duration,
  questions,
  onStart,
}: InterviewTypeCardProps) => {
  return (
    <Card className="gradient-card shadow-soft hover:shadow-strong transition-smooth p-6 group">
      <div className="mb-4">
        <div className="gradient-primary rounded-xl p-3 w-fit mb-4 shadow-soft group-hover:scale-110 transition-smooth">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Duration:</span> {duration}
        </div>
        <div>
          <span className="font-medium">Questions:</span> {questions}
        </div>
      </div>

      <Button 
        onClick={onStart}
        className="w-full gradient-primary text-white hover:opacity-90 transition-smooth"
      >
        Start Interview
      </Button>
    </Card>
  );
};
