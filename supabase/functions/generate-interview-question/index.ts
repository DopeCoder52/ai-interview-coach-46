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

    // Build subject-specific system prompts
    const subjectPrompts: { [key: string]: string } = {
      'DSA': `You are an expert interviewer for Data Structures and Algorithms. Generate challenging questions that assess problem-solving, algorithmic thinking, and coding ability. Focus on arrays, trees, graphs, dynamic programming, and optimization.`,
      'OS': `You are an expert interviewer for Operating Systems. Generate questions about processes, threads, memory management, file systems, deadlocks, scheduling algorithms, and system calls.`,
      'DBMS': `You are an expert interviewer for Database Management Systems. Generate questions about normalization, transactions, ACID properties, indexing, SQL queries, joins, and database design.`,
      'Networks': `You are an expert interviewer for Computer Networks. Generate questions about OSI/TCP-IP models, protocols (HTTP, TCP, UDP), routing, DNS, network security, and socket programming.`,
      'OOPS': `You are an expert interviewer for Object-Oriented Programming. Generate questions about classes, objects, inheritance, polymorphism, encapsulation, abstraction, and design patterns.`
    };

    const systemPrompt = subjectPrompts[currentSubject] || `You are an expert interviewer for ${currentSubject}.`;

    // Build user prompt
    let userPrompt = '';
    if (previousQuestions.length === 0) {
      userPrompt = `Generate the first question about ${currentSubject}. Make it medium difficulty. The interview will have ${totalQuestions} total questions across these subjects: ${subjects.join(', ')}.`;
    } else {
      userPrompt = `Generate question #${questionNumber} about ${currentSubject}.
      
Previous questions asked:
${previousQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

Ensure this question is different, covers new concepts in ${currentSubject}, and progressively increases difficulty.`;
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
