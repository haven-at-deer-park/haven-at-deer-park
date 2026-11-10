import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-trigger",
};

const TOPIC_POOL = [
  {
    topic: "How to Choose Memory Care vs. Assisted Living in Deer Park, TX",
    category: "Family Guides",
    keywords: ["assisted living Deer Park TX", "memory care Texas", "senior living guide"],
  },
  {
    topic: "5 Signs Your Aging Parent May Benefit from Assisted Living Support",
    category: "Caregiver Support",
    keywords: ["aging parent support", "assisted living signs", "Haven at Deer Park"],
  },
  {
    topic: "Daily Nutrition and Hydration Habits for Vibrant Senior Living",
    category: "Senior Wellness",
    keywords: ["senior nutrition", "healthy aging", "assisted living dining"],
  },
  {
    topic: "Preparing for a Smooth Transition into Assisted Living in Pasadena & Deer Park",
    category: "Transition Planning",
    keywords: ["moving to assisted living", "Deer Park senior community", "Pasadena TX senior care"],
  },
  {
    topic: "Engaging Daily Activities That Boost Cognitive Health in Seniors",
    category: "Life Enrichment",
    keywords: ["senior activities", "cognitive health", "assisted living lifestyle"],
  },
  {
    topic: "Questions to Ask When Touring an Assisted Living Community in Texas",
    category: "Family Guides",
    keywords: ["assisted living tour checklist", "Texas senior living", "Haven at Deer Park tour"],
  },
  {
    topic: "Understanding Respite Care and Short-Term Stays for Family Caregivers",
    category: "Caregiver Support",
    keywords: ["respite care Deer Park", "caregiver relief", "short term senior care"],
  },
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey =
      Deno.env.get("GEMINI_API_KEY") ||
      Deno.env.get("GOOGLE_AI_API_KEY") ||
      Deno.env.get("GOOGLE_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body from pg_cron is valid
    }

    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title, slug, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    const force = body?.force === true;
    if (!force && recentPosts && recentPosts.length > 0 && recentPosts[0].created_at) {
      const hoursSinceLast =
        (Date.now() - new Date(recentPosts[0].created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 20) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            message: "Daily SEO blog post already generated within the last 20 hours.",
            latestPost: recentPosts[0],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const existingTitles = new Set(
      (recentPosts || []).map((p: any) => (p.title || "").toLowerCase())
    );
    const selected =
      TOPIC_POOL.find((t) => !existingTitles.has(t.topic.toLowerCase())) ||
      TOPIC_POOL[Math.floor(Date.now() / 86400000) % TOPIC_POOL.length];

    let title = selected.topic;
    let excerpt = `Compassionate guidance from Haven at Deer Park on ${selected.topic.toLowerCase()}.`;
    let content = `## ${selected.topic}\n\nAt **Haven at Deer Park**, we help families across Deer Park, Pasadena, and the Greater Houston area navigate every step of senior care with dignity, warmth, and clinical excellence.\n\n### Key Takeaways for Families\n- Personalized care plans tailored to each resident's daily routines and preferences\n- Chef-prepared meals, medication management, and 24/7 compassionate support\n- Schedule a private tour at Haven at Deer Park to meet our care team in person.`;

    const prompt = `Write an authoritative, warm, SEO & AEO-optimized senior living blog article for Haven at Deer Park (havenatdeerpark.com, located in Deer Park, TX).
Topic: ${selected.topic}
Category: ${selected.category}
Target Keywords: ${selected.keywords.join(", ")}
Return JSON with keys: "title", "excerpt", "content" (Markdown with H2/H3 headings and FAQ section).`;

    let aiGenerated = false;
    if (geminiApiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            title = parsed.title || title;
            excerpt = parsed.excerpt || excerpt;
            content = parsed.content || content;
            aiGenerated = true;
          }
        }
      } catch (e) {
        console.warn("Gemini generation failed, trying fallback:", e);
      }
    }

    if (!aiGenerated && openaiApiKey) {
      try {
        const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an expert senior living and memory care SEO content strategist for Haven at Deer Park (Deer Park, TX). Return valid JSON only.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (oaRes.ok) {
          const oaData = await oaRes.json();
          const text = oaData?.choices?.[0]?.message?.content;
          if (text) {
            const parsed = JSON.parse(text);
            title = parsed.title || title;
            excerpt = parsed.excerpt || excerpt;
            content = parsed.content || content;
            aiGenerated = true;
          }
        }
      } catch (e) {
        console.warn("OpenAI fallback failed, using template:", e);
      }
    }

    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
      "-" +
      new Date().toISOString().slice(0, 10);

    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        excerpt,
        content,
        category: selected.category,
        tags: selected.keywords,
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

