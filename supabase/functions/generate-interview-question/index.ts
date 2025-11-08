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
    const { interviewType, questionNumber, previousQuestions } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context-aware system prompt based on interview type
    let systemPrompt = '';
    
    if (interviewType === 'Technical - DSA') {
      systemPrompt = `You are an expert technical interviewer for CSE students. 
Generate clear, well-structured Data Structures and Algorithms questions.
Focus on: Arrays, Linked Lists, Trees, Graphs, Dynamic Programming, Sorting, Searching.
Provide a single question that tests problem-solving and coding skills.
Format: State the problem clearly with constraints and expected output.`;
    } else if (interviewType === 'System Design') {
      systemPrompt = `You are an expert system design interviewer for CSE students.
Generate realistic system design questions about scalable applications.
Focus on: Architecture, Databases, Caching, Load Balancing, Microservices.
Provide a single high-level design challenge.
Format: Describe the system to design and key requirements.`;
    } else if (interviewType === 'HR & Behavioral') {
      systemPrompt = `You are an experienced HR interviewer for CSE students.
Generate professional behavioral and situational questions.
Focus on: Teamwork, Leadership, Problem-solving, Conflict resolution, Career goals.
Provide a single thoughtful question that reveals candidate's soft skills.
Format: Ask an open-ended question about their experiences or approach.`;
    }

    const userPrompt = previousQuestions && previousQuestions.length > 0
      ? `Generate question ${questionNumber}. Previous questions asked: ${previousQuestions.join(', ')}. 
         Make sure this question is different and progressively challenging.`
      : `Generate the first interview question for a ${interviewType} interview.`;

    console.log('Generating question:', { interviewType, questionNumber });

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
