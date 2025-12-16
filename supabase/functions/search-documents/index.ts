import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Searching documents for:", query);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all documents with extracted text
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, filename, extracted_text, created_at, file_size, mime_type")
      .eq("status", "ready")
      .not("extracted_text", "is", null);

    if (error) {
      console.error("Database error:", error);
      throw new Error("Failed to search documents");
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search through documents
    const searchTerms = query.toLowerCase().split(/\s+/).filter((t: string) => t.length > 2);
    
    const results = documents
      .map((doc) => {
        const text = (doc.extracted_text || "").toLowerCase();
        const filename = doc.filename.toLowerCase();
        
        let score = 0;
        const matches: Array<{ term: string; context: string; position: number }> = [];
        
        // Check filename matches
        for (const term of searchTerms) {
          if (filename.includes(term)) {
            score += 10; // Higher score for filename matches
          }
        }
        
        // Check content matches
        for (const term of searchTerms) {
          const termRegex = new RegExp(term, "gi");
          let match;
          let termCount = 0;
          
          while ((match = termRegex.exec(doc.extracted_text || "")) !== null && termCount < 3) {
            termCount++;
            score += 1;
            
            // Extract context around the match
            const start = Math.max(0, match.index - 50);
            const end = Math.min((doc.extracted_text || "").length, match.index + term.length + 50);
            const context = (doc.extracted_text || "").slice(start, end).trim();
            
            matches.push({
              term,
              context: (start > 0 ? "..." : "") + context + (end < (doc.extracted_text || "").length ? "..." : ""),
              position: match.index,
            });
          }
        }
        
        return {
          id: doc.id,
          filename: doc.filename,
          file_size: doc.file_size,
          mime_type: doc.mime_type,
          created_at: doc.created_at,
          score,
          matches: matches.slice(0, 5), // Limit to 5 matches per document
          preview: (doc.extracted_text || "").slice(0, 200) + "...",
        };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`Found ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
