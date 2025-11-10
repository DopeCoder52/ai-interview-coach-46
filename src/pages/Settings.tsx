import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  User,
  Mail,
  Save,
  Download,
  History,
  Settings as SettingsIcon,
  Loader2,
  FileText,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address"),
});

interface Session {
  id: string;
  interview_type: string;
  status: string;
  started_at: string;
  completed_at: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
      loadSessions();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      setFullName(data?.full_name || "");
      setEmail(user?.email || "");
    } catch (error: any) {
      console.error("Error loading user data:", error);
    }
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = profileSchema.parse({ fullName, email });

      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: validatedData.fullName })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (validatedData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: validatedData.email,
        });

        if (emailError) throw emailError;

        toast({
          title: "Email Update",
          description: "Please check your new email for verification link",
        });
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error("Error updating profile:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to update profile",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadPerformanceReport = async () => {
    try {
      // Fetch all session data with responses
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "completed")
        .order("started_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionIds = sessionsData?.map(s => s.id) || [];

      const { data: responsesData, error: responsesError } = await supabase
        .from("interview_responses")
        .select("*")
        .in("session_id", sessionIds);

      if (responsesError) throw responsesError;

      // Generate report content
      let reportContent = `INTERVIEW PERFORMANCE REPORT\n`;
      reportContent += `Generated: ${new Date().toLocaleString()}\n`;
      reportContent += `User: ${fullName || user?.email}\n`;
      reportContent += `${"=".repeat(80)}\n\n`;

      // Calculate overall statistics
      const totalSessions = sessionsData?.length || 0;
      const totalResponses = responsesData?.length || 0;
      const averageScore = totalResponses > 0
        ? Math.round(responsesData.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses)
        : 0;

      reportContent += `OVERALL STATISTICS\n`;
      reportContent += `${"-".repeat(80)}\n`;
      reportContent += `Total Interviews Completed: ${totalSessions}\n`;
      reportContent += `Total Questions Answered: ${totalResponses}\n`;
      reportContent += `Average Score: ${averageScore}%\n\n`;

      // Add individual session details
      reportContent += `INTERVIEW HISTORY\n`;
      reportContent += `${"-".repeat(80)}\n\n`;

      for (const session of sessionsData || []) {
        const sessionResponses = responsesData?.filter(r => r.session_id === session.id) || [];
        const sessionScore = sessionResponses.length > 0
          ? Math.round(sessionResponses.reduce((sum, r) => sum + (r.score || 0), 0) / sessionResponses.length)
          : 0;

        reportContent += `Session: ${session.interview_type}\n`;
        reportContent += `Date: ${new Date(session.started_at).toLocaleString()}\n`;
        reportContent += `Duration: ${Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)} minutes\n`;
        reportContent += `Score: ${sessionScore}%\n`;
        reportContent += `Questions Answered: ${sessionResponses.length}\n\n`;

        sessionResponses.forEach((response, index) => {
          let feedback;
          try {
            feedback = typeof response.ai_feedback === 'string'
              ? JSON.parse(response.ai_feedback)
              : response.ai_feedback;
          } catch (e) {
            feedback = {};
          }

          reportContent += `  Q${index + 1}: ${response.question_text}\n`;
          reportContent += `  Score: ${response.score}/100\n`;
          if (feedback.feedback) {
            reportContent += `  Feedback: ${feedback.feedback}\n`;
          }
          reportContent += `\n`;
        });

        reportContent += `${"-".repeat(80)}\n\n`;
      }

      // Create and download file
      const blob = new Blob([reportContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-performance-report-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Performance report downloaded successfully",
      });
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate performance report",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen gradient-hero">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="container mx-auto">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="profile">
              <User className="mr-2 h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="mr-2 h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="gradient-card shadow-medium p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Profile Information</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-9"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="pl-9"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Changing your email will require verification
                  </p>
                </div>

                <Separator />

                <Button
                  type="submit"
                  disabled={loading}
                  className="gradient-primary text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="gradient-card shadow-medium p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Interview History</h2>

              {loadingSessions ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading history...
                </div>
              ) : sessions.length > 0 ? (
                <div className="space-y-4">
                  {sessions.map((session) => {
                    const duration = session.completed_at && session.started_at
                      ? Math.round((new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 60000)
                      : 0;

                    return (
                      <div
                        key={session.id}
                        className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition-smooth"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">
                              {session.interview_type}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(session.started_at).toLocaleDateString()}</span>
                              </div>
                              {duration > 0 && (
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>{duration} minutes</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                              {session.status}
                            </Badge>
                            {session.status === "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/results?session=${session.id}`)}
                              >
                                View Details
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No interview history yet</p>
                  <Button
                    onClick={() => navigate("/")}
                    className="mt-4 gradient-primary text-white"
                  >
                    Start Your First Interview
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="gradient-card shadow-medium p-6">
              <h2 className="text-xl font-bold text-foreground mb-6">Performance Reports</h2>

              <div className="space-y-6">
                <div className="bg-muted/30 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="gradient-primary rounded-lg p-3">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-2">
                        Complete Performance Report
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download a comprehensive report of all your interview sessions, including
                        scores, feedback, and performance trends. This report includes all completed
                        interviews with detailed question-by-question analysis.
                      </p>
                      <Button
                        onClick={downloadPerformanceReport}
                        className="gradient-primary text-white"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <h4 className="font-semibold text-foreground mb-2">Report includes:</h4>
                  <ul className="space-y-1 ml-4">
                    <li>• Overall performance statistics</li>
                    <li>• Session-by-session breakdown</li>
                    <li>• Individual question scores and feedback</li>
                    <li>• Time spent on each interview</li>
                    <li>• Performance trends over time</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
