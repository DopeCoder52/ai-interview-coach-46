import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Video, Mic, MicOff, Send, Loader2, CheckCircle, Volume2 } from "lucide-react";
import { VoiceManager } from "@/utils/voiceManager";

const InterviewSession = () => {
  const [searchParams] = useSearchParams();
  const subjectsParam = searchParams.get("subjects") || "DSA";
  const subjects = subjectsParam.split(',');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answer, setAnswer] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState(0);
  const totalQuestions = 5;

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [voiceManager] = useState(() => new VoiceManager());
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    initializeSession();
    requestMediaAccess();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      voiceManager.cleanup();
    };
  }, []);

  const initializeSession = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: user.id,
          interview_type: subjects.join(', '),
          status: 'in-progress',
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      await loadNextQuestion([]);
    } catch (error: any) {
      console.error('Error initializing session:', error);
      toast({
        title: "Error",
        description: "Failed to start interview session",
        variant: "destructive",
      });
    }
  };

  const requestMediaAccess = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing media:', error);
      toast({
        title: "Camera/Microphone Access",
        description: "Please allow camera and microphone access for the best experience",
        variant: "destructive",
      });
    }
  };

  const toggleRecording = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsRecording(!isRecording);
    }
  };

  const loadNextQuestion = async (prevQuestions: string[]) => {
    setIsLoadingQuestion(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-interview-question', {
        body: {
          subjects,
          questionNumber,
          totalQuestions,
          previousQuestions: prevQuestions,
        },
      });

      if (error) throw error;

      setCurrentQuestion(data.question);
      setAnswer("");
      
      // Speak the question
      setIsSpeaking(true);
      await voiceManager.speakText(data.question);
      setIsSpeaking(false);
    } catch (error: any) {
      console.error('Error loading question:', error);
      toast({
        title: "Error",
        description: "Failed to load question. Please try again.",
        variant: "destructive",
      });
      setIsSpeaking(false);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const startVoiceAnswer = async () => {
    if (!stream) {
      toast({
        title: "Microphone Required",
        description: "Please enable microphone access",
        variant: "destructive",
      });
      return;
    }

    try {
      await voiceManager.startRecording(stream);
      setIsVoiceRecording(true);
      toast({
        title: "Recording Started",
        description: "Speak your answer clearly",
      });
    } catch (error) {
      console.error('Error starting voice recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start voice recording",
        variant: "destructive",
      });
    }
  };

  const stopVoiceAnswer = async () => {
    try {
      const audioBase64 = await voiceManager.stopRecording();
      setIsVoiceRecording(false);
      
      toast({
        title: "Processing...",
        description: "Transcribing your answer",
      });

      const transcribedText = await voiceManager.transcribeAudio(audioBase64);
      setAnswer(transcribedText);
      
      toast({
        title: "Answer Recorded",
        description: "You can now review and submit",
      });
    } catch (error) {
      console.error('Error processing voice answer:', error);
      toast({
        title: "Error",
        description: "Failed to process voice answer",
        variant: "destructive",
      });
      setIsVoiceRecording(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !sessionId) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Analyze the answer
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        'analyze-interview-answer',
        {
          body: {
            question: currentQuestion,
            answer,
            subjects: subjects.join(', '),
          },
        }
      );

      if (analysisError) throw analysisError;

      // Save the response
      const { error: saveError } = await supabase
        .from('interview_responses')
        .insert({
          session_id: sessionId,
          question_text: currentQuestion,
          answer_text: answer,
          ai_feedback: JSON.stringify(analysisData),
          score: analysisData.score || 0,
        });

      if (saveError) throw saveError;

      toast({
        title: "Answer Submitted",
        description: `Score: ${analysisData.score}/100`,
      });

      const newCompletedQuestions = completedQuestions + 1;
      setCompletedQuestions(newCompletedQuestions);
      setPreviousQuestions([...previousQuestions, currentQuestion]);

      if (newCompletedQuestions >= totalQuestions) {
        // Complete the session
        await completeSession();
      } else {
        // Load next question
        setQuestionNumber(questionNumber + 1);
        await loadNextQuestion([...previousQuestions, currentQuestion]);
      }
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('interview_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Interview Complete!",
        description: "Great job! Redirecting to results...",
      });

      setTimeout(() => {
        navigate(`/results?session=${sessionId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Error completing session:', error);
    }
  };

  const progress = (completedQuestions / totalQuestions) * 100;

  return (
    <div className="min-h-screen gradient-hero">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{subjects.join(', ')}</h1>
            <p className="text-sm text-muted-foreground">
              Question {completedQuestions + 1} of {totalQuestions}
            </p>
          </div>
          <Progress value={progress} className="w-48" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video Section */}
          <Card className="gradient-card shadow-medium p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">Your Video</h2>
              <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <Button
                    variant={isRecording ? "default" : "secondary"}
                    size="icon"
                    onClick={toggleRecording}
                    className="rounded-full"
                  >
                    {isRecording ? (
                      <Mic className="h-5 w-5" />
                    ) : (
                      <MicOff className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {isRecording ? "Microphone active" : "Microphone muted"}
              </p>
            </div>
          </Card>

          {/* Question & Answer Section */}
          <Card className="gradient-card shadow-medium p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-foreground">Current Question</h2>
                  {isSpeaking && (
                    <div className="flex items-center gap-2 text-primary">
                      <Volume2 className="h-4 w-4 animate-pulse" />
                      <span className="text-sm">AI Speaking...</span>
                    </div>
                  )}
                </div>
                {isLoadingQuestion ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-foreground leading-relaxed">{currentQuestion}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Your Answer (Voice)</h3>
                <div className="bg-muted/30 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                  {answer ? (
                    <p className="text-foreground text-center italic">"{answer}"</p>
                  ) : (
                    <p className="text-muted-foreground text-center">
                      Click the microphone button below to record your answer
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {!isVoiceRecording ? (
                  <>
                    <Button
                      onClick={startVoiceAnswer}
                      disabled={isLoadingQuestion || isSubmitting || isSpeaking || !answer.trim()}
                      size="lg"
                      className="flex-1 gradient-primary text-white"
                    >
                      <Mic className="mr-2 h-5 w-5" />
                      {answer ? 'Record Again' : 'Start Recording'}
                    </Button>
                    {answer && (
                      <Button
                        onClick={submitAnswer}
                        disabled={isLoadingQuestion || isSubmitting}
                        size="lg"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing...
                          </>
                        ) : completedQuestions === totalQuestions - 1 ? (
                          <>
                            <CheckCircle className="mr-2 h-5 w-5" />
                            Submit Final Answer
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Submit & Continue
                          </>
                        )}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={stopVoiceAnswer}
                    size="lg"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  >
                    <MicOff className="mr-2 h-5 w-5" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Voice Interview Tips */}
        <Card className="gradient-card shadow-soft p-6 mt-6">
          <h3 className="font-semibold text-foreground mb-3">Voice Interview Tips</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Speak clearly and at a moderate pace</li>
            <li>• Listen carefully to each question before answering</li>
            <li>• Take a moment to organize your thoughts</li>
            <li>• Explain your reasoning step-by-step for technical questions</li>
            <li>• Use examples to illustrate your points</li>
            <li>• If you need clarification, you can re-record your answer</li>
          </ul>
        </Card>
      </main>
    </div>
  );
};

export default InterviewSession;
