import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Award,
  Brain,
  Home,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Response {
  question_text: string;
  answer_text: string;
  score: number;
  ai_feedback: any;
}

interface Session {
  id: string;
  interview_type: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_minutes: number;
}

const Results = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  const loadResults = async () => {
    try {
      // Fetch session data
      const { data: sessionData, error: sessionError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch responses
      const { data: responsesData, error: responsesError } = await supabase
        .from("interview_responses")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (error: any) {
      console.error("Error loading results:", error);
      toast({
        title: "Error",
        description: "Failed to load interview results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageScore = () => {
    if (responses.length === 0) return 0;
    const total = responses.reduce((sum, r) => sum + (r.score || 0), 0);
    return Math.round(total / responses.length);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-accent";
    return "text-destructive";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero p-6">
        <div className="container mx-auto max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-48 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Card className="gradient-card shadow-strong p-8 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Session Not Found</h2>
          <p className="text-muted-foreground mb-6">
            We couldn't find the interview session you're looking for.
          </p>
          <Button onClick={() => navigate("/")} className="gradient-primary text-white">
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const averageScore = calculateAverageScore();

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="container mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Overall Results Card */}
        <Card className="gradient-card shadow-strong p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Interview Results
              </h1>
              <p className="text-muted-foreground">
                {session.interview_type} • {new Date(session.completed_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={averageScore >= 70 ? "default" : "secondary"} className="text-lg px-4 py-2">
              {session.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <Trophy className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
              <p className={`text-4xl font-bold ${getScoreColor(averageScore)}`}>
                {averageScore}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{getScoreLabel(averageScore)}</p>
            </div>

            <div className="text-center">
              <Brain className="h-8 w-8 text-secondary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Questions Answered</p>
              <p className="text-4xl font-bold text-foreground">{responses.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Questions</p>
            </div>

            <div className="text-center">
              <Award className="h-8 w-8 text-accent mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Duration</p>
              <p className="text-4xl font-bold text-foreground">
                {session.duration_minutes || Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Minutes</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Performance</span>
              <span className="text-sm text-muted-foreground">{averageScore}%</span>
            </div>
            <Progress value={averageScore} className="h-3" />
          </div>
        </Card>

        {/* Detailed Feedback */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Detailed Feedback</h2>

          {responses.map((response, index) => {
            let feedback;
            try {
              feedback = typeof response.ai_feedback === 'string' 
                ? JSON.parse(response.ai_feedback) 
                : response.ai_feedback;
            } catch (e) {
              feedback = { strengths: [], improvements: [], feedback: "Feedback processing error" };
            }

            return (
              <Card key={index} className="gradient-card shadow-soft p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground mb-2">
                      Question {index + 1}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {response.question_text}
                    </p>
                  </div>
                  <Badge className={`${getScoreColor(response.score)} ml-4`}>
                    {response.score}/100
                  </Badge>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-foreground mb-1">Your Answer:</p>
                  <p className="text-sm text-muted-foreground">{response.answer_text}</p>
                </div>

                {feedback.strengths && feedback.strengths.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <h4 className="font-semibold text-foreground">Strengths</h4>
                    </div>
                    <ul className="space-y-1 ml-7">
                      {feedback.strengths.map((strength: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.improvements && feedback.improvements.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-accent" />
                      <h4 className="font-semibold text-foreground">Areas for Improvement</h4>
                    </div>
                    <ul className="space-y-1 ml-7">
                      {feedback.improvements.map((improvement: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {feedback.feedback && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-foreground">Overall Feedback</h4>
                    </div>
                    <p className="text-sm text-muted-foreground ml-7">
                      {feedback.feedback}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 gradient-primary text-white"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button
            onClick={() => window.location.href = "/"}
            variant="outline"
            className="flex-1"
          >
            Start New Interview
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Results;
