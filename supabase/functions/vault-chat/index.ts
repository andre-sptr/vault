import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, documentContext } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the system message with document context
    let systemMessage = `You are Vault AI, an expert document analysis assistant for enterprise users. Your role is to help users understand, analyze, and extract insights from their secure documents.

IMPORTANT INSTRUCTIONS:
1. When answering questions, always provide DETAILED, WELL-STRUCTURED responses with clear sections using markdown formatting (headers, bullet points, bold text).

2. For every factual claim or data point you provide, include a citation reference in brackets like [1], [2], etc. These citations should reference specific sections of the document being discussed.

3. When discussing financial data, include specific numbers, percentages, and comparisons where relevant.

4. Structure your responses with clear sections like:
   - **Key Findings**: Main points answering the user's question
   - **Details**: Supporting information and context
   - **Implications**: What this means for the user/organization

5. Be professional, precise, and thorough. You're assisting enterprise professionals who need accurate, actionable insights.

6. At the end of your response, provide a list of citations with page numbers that support your analysis, formatted as:
   CITATIONS:
   [1] Page X - Brief description of the cited content
   [2] Page Y - Brief description of the cited content

Remember: You're analyzing secure, confidential documents. Maintain a professional tone befitting enterprise document analysis.`;

    if (documentContext) {
      systemMessage += `\n\n---\nCURRENT DOCUMENT: ${documentContext.filename}\n`;
      
      if (documentContext.extractedText && documentContext.extractedText.length > 100) {
        // Include the actual document content for RAG
        const truncatedText = documentContext.extractedText.slice(0, 50000); // Limit to ~50k chars
        systemMessage += `\nDOCUMENT CONTENT:\n${truncatedText}\n`;
        systemMessage += `\n---\nAnalyze the document content above to answer user questions. Provide specific details and cite page numbers based on the content sections.`;
      } else {
        systemMessage += `\nThe document has been uploaded. Provide helpful analysis based on the filename and document type. Generate realistic example insights that would be relevant for this type of document.`;
      }
    }

    console.log("Starting Vault AI chat with", messages.length, "messages");
    console.log("Document context:", documentContext?.filename);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemMessage },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response from AI gateway");
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Vault chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
