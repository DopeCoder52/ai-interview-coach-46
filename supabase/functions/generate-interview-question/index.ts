import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subjects, questionNumber, totalQuestions = 15, previousQuestions } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Calculate which subject to ask about (distribute evenly)
    const questionsPerSubject = Math.floor(totalQuestions / subjects.length);
    const remainder = totalQuestions % subjects.length;
    
    // Determine current subject based on question number
    let currentSubject = subjects[0];
    let questionsAsked = 0;
    
    for (let i = 0; i < subjects.length; i++) {
      const questionsForThisSubject = questionsPerSubject + (i < remainder ? 1 : 0);
      if (questionNumber <= questionsAsked + questionsForThisSubject) {
        currentSubject = subjects[i];
        break;
      }
      questionsAsked += questionsForThisSubject;
    }

    // Build conversational HR-style prompts
    const subjectPrompts: { [key: string]: string } = {
      'DSA': `You are a friendly HR interviewer having a natural conversation about Data Structures and Algorithms. Speak as if you're directly talking to the candidate. Use casual phrases like "Alright", "Let me ask you", "Here's one for you". Ask ONE clear technical question about arrays, trees, graphs, dynamic programming, or optimization. Keep it conversational but professional.`,
      'OS': `You are a friendly HR interviewer having a natural conversation about Operating Systems. Speak directly to the candidate using phrases like "Okay", "Let's talk about", "Tell me". Ask ONE clear question about processes, threads, memory management, scheduling, or deadlocks. Keep it conversational.`,
      'DBMS': `You are a friendly HR interviewer having a natural conversation about Database Management Systems. Talk naturally using phrases like "Alright", "Here's what I want to know", "Let me ask you". Ask ONE clear question about normalization, transactions, indexing, or SQL. Keep it conversational.`,
      'Networks': `You are a friendly HR interviewer having a natural conversation about Computer Networks. Speak casually using phrases like "Okay", "Let's discuss", "Tell me about". Ask ONE clear question about protocols, OSI model, routing, or network security. Keep it conversational.`,
      'OOPS': `You are a friendly HR interviewer having a natural conversation about Object-Oriented Programming. Use natural phrases like "Alright", "Here's my question", "Let me ask". Ask ONE clear question about classes, inheritance, polymorphism, or design patterns. Keep it conversational.`
    };

    const systemPrompt = subjectPrompts[currentSubject] || `You are a friendly HR interviewer for ${currentSubject}. Speak naturally and conversationally.`;

    // Build user prompt
    let userPrompt = '';
    if (previousQuestions.length === 0) {
      userPrompt = `Generate the first question about ${currentSubject}. Start with a casual greeting like "Alright, let's start with..." or "Okay, first question..." Then ask ONE clear technical question. Keep it medium difficulty and conversational for a voice interview.`;
    } else {
      userPrompt = `Generate question #${questionNumber} about ${currentSubject}. Start with a transition phrase like "Next question", "Alright", or "Here's another one". Then ask ONE clear technical question.
      
Questions already asked: ${previousQuestions.map((q: string, i: number) => `${i + 1}. ${q.substring(0, 100)}...`).join('\n')}

Make it different, cover new concepts, and sound natural for a voice conversation.`;
    }

    console.log('Generating question:', { subjects, currentSubject, questionNumber });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const question = data.choices[0]?.message?.content || 'Could not generate question';

    console.log('Question generated successfully');

    return new Response(
      JSON.stringify({ question }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-interview-question:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
