import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { SessionCard } from "@/components/SessionCard";
import { InterviewTypeCard } from "@/components/InterviewTypeCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  Brain,
  TrendingUp,
  Clock,
  Award,
  Code,
  Users,
  Briefcase,
  ChevronRight,
  Video,
  Mic,
  BarChart3,
  Sparkles,
  LogOut,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Session {
  id: string;
  interview_type: string;
  status: string;
  started_at: string;
  completed_at: string;
}

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeView, setActiveView] = useState<"dashboard" | "start">("dashboard");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    timePracticed: 0,
    skillsMastered: 0,
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .order("started_at", { ascending: false })
        .limit(6);

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch responses to calculate stats
      const { data: responsesData, error: responsesError } = await supabase
        .from("interview_responses")
        .select("score, session_id")
        .in("session_id", sessionsData?.map(s => s.id) || []);

      if (responsesError) throw responsesError;

      // Calculate stats
      const completedSessions = sessionsData?.filter(s => s.status === "completed") || [];
      const totalScore = responsesData?.reduce((sum, r) => sum + (r.score || 0), 0) || 0;
      const avgScore = responsesData && responsesData.length > 0 
        ? Math.round(totalScore / responsesData.length) 
        : 0;

      const totalMinutes = completedSessions.reduce((sum, s) => {
        const duration = s.completed_at && s.started_at 
          ? Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 60000)
          : 0;
        return sum + duration;
      }, 0);

      setStats({
        totalInterviews: sessionsData?.length || 0,
        averageScore: avgScore,
        timePracticed: Math.round(totalMinutes / 60 * 10) / 10,
        skillsMastered: Math.min(Math.floor(avgScore / 10), 12),
      });
    } catch (error: any) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = (type: string) => {
    navigate(`/interview?type=${encodeURIComponent(type)}`);
  };

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="gradient-primary p-2 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">InterviewAI</h1>
                <p className="text-xs text-muted-foreground">Master Your CSE Interviews</p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <Button
                variant={activeView === "dashboard" ? "default" : "ghost"}
                onClick={() => setActiveView("dashboard")}
              >
                Dashboard
              </Button>
              <Button
                variant={activeView === "start" ? "default" : "ghost"}
                onClick={() => setActiveView("start")}
                className="gradient-primary text-white"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Start Interview
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/settings")}
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {activeView === "dashboard" ? (
          <>
            {/* Welcome Section */}
            <section className="mb-12">
              <Card className="gradient-card shadow-strong p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-foreground mb-3">
                      Welcome back, {user?.user_metadata?.full_name || 'there'}! 👋
                    </h2>
                    <p className="text-muted-foreground text-lg mb-6">
                      Ready to ace your next interview? Let's continue your preparation journey.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setActiveView("start")}
                        size="lg"
                        className="gradient-primary text-white"
                      >
                        Start New Interview
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                      <Button variant="outline" size="lg">
                        View Progress
                      </Button>
                    </div>
                  </div>
                  <div className="hidden lg:flex items-center justify-center">
                    <div className="relative">
                      <div className="gradient-primary opacity-20 blur-3xl absolute inset-0 rounded-full" />
                      <Video className="h-32 w-32 text-primary relative z-10" />
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Stats Section */}
            <section className="mb-12">
              <h3 className="text-2xl font-bold text-foreground mb-6">Your Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Interviews"
                  value={stats.totalInterviews}
                  icon={Video}
                  description="All time"
                />
                <StatsCard
                  title="Average Score"
                  value={`${stats.averageScore}%`}
                  icon={TrendingUp}
                  description="Across all interviews"
                />
                <StatsCard
                  title="Time Practiced"
                  value={`${stats.timePracticed}h`}
                  icon={Clock}
                  description="Total practice time"
                />
                <StatsCard
                  title="Skills Mastered"
                  value={stats.skillsMastered}
                  icon={Award}
                  description="Core competencies"
                />
              </div>
            </section>

            {/* Recent Sessions */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-foreground">Recent Sessions</h3>
              </div>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading your sessions...
                </div>
              ) : sessions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sessions.map((session) => {
                    const duration = session.completed_at && session.started_at
                      ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
                      : 0;
                    
                    return (
                      <SessionCard
                        key={session.id}
                        sessionId={session.id}
                        date={new Date(session.started_at).toLocaleDateString()}
                        duration={`${duration} min`}
                        type={session.interview_type}
                        status={session.status as "completed" | "in-progress"}
                      />
                    );
                  })}
                </div>
              ) : (
                <Card className="gradient-card shadow-soft p-8 text-center">
                  <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No interviews yet. Start your first practice session!
                  </p>
                  <Button
                    onClick={() => setActiveView("start")}
                    className="gradient-primary text-white"
                  >
                    Start Interview
                  </Button>
                </Card>
              )}
            </section>

            {/* Features Showcase */}
            <section>
              <h3 className="text-2xl font-bold text-foreground mb-6">Platform Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="gradient-card shadow-soft p-6">
                  <Mic className="h-8 w-8 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Audio & Video Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Get real-time feedback on your communication, body language, and delivery.
                  </p>
                </Card>
                <Card className="gradient-card shadow-soft p-6">
                  <BarChart3 className="h-8 w-8 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Detailed Analytics
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Track your progress with comprehensive performance metrics and insights.
                  </p>
                </Card>
                <Card className="gradient-card shadow-soft p-6">
                  <Brain className="h-8 w-8 text-primary mb-4" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    AI-Powered Feedback
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Receive personalized recommendations to improve your interview skills.
                  </p>
                </Card>
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Start Interview View */}
            <section className="mb-8">
              <Card className="gradient-card shadow-strong p-8 mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Choose Your Interview Type
                </h2>
                <p className="text-muted-foreground text-lg">
                  Select the type of interview you want to practice. Our AI will adapt questions based on your performance.
                </p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InterviewTypeCard
                  title="Technical - DSA"
                  description="Practice data structures, algorithms, and coding problems"
                  icon={Code}
                  duration="30-45 min"
                  questions={8}
                  onStart={() => handleStartInterview("Technical DSA")}
                />
                <InterviewTypeCard
                  title="System Design"
                  description="Design scalable systems and architecture solutions"
                  icon={Briefcase}
                  duration="45-60 min"
                  questions={3}
                  onStart={() => handleStartInterview("System Design")}
                />
                <InterviewTypeCard
                  title="HR & Behavioral"
                  description="Master common HR questions and behavioral scenarios"
                  icon={Users}
                  duration="20-30 min"
                  questions={10}
                  onStart={() => handleStartInterview("HR & Behavioral")}
                />
              </div>
            </section>

            <Card className="gradient-card shadow-soft p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Before You Start
              </h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <p>Ensure your camera and microphone are properly connected and working</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <Mic className="h-4 w-4 text-primary" />
                  </div>
                  <p>Find a quiet, well-lit environment for the best experience</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <p>Allow sufficient time to complete your session without interruptions</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
