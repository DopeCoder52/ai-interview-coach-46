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
    const { question, answer, interviewType } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert interview evaluator for CSE students.
Analyze the candidate's answer and provide:
1. A score out of 100
2. Specific strengths (2-3 points)
3. Areas for improvement (2-3 points)
4. Overall feedback (2-3 sentences)

Be constructive, encouraging, and specific. Format your response as JSON with keys: score, strengths (array), improvements (array), feedback (string).`;

    const userPrompt = `Interview Type: ${interviewType}
Question: ${question}
Candidate's Answer: ${answer}

Evaluate this answer comprehensively.`;

    console.log('Analyzing answer for:', interviewType);

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
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let analysisText = data.choices[0]?.message?.content || '{}';
    
    // Try to extract JSON from the response
    let analysis;
    try {
      // Remove markdown code blocks if present
      analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response
      analysis = {
        score: 70,
        strengths: ['Attempted to answer the question'],
        improvements: ['Provide more detailed explanations', 'Include specific examples'],
        feedback: 'Good effort. Keep practicing to improve your interview skills.'
      };
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-interview-answer:', error);
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
