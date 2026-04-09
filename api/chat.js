export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

function buildSystemPrompt(studentName, sections, siteData) {
  return `You are PSC Agent — the AI website builder for PSC Lash Academy 180 Degree Programme students.

You work exactly like v0. The student types anything and you build immediately. You never ask questions before building. You make smart assumptions and create something beautiful straight away. They can refine after.

STUDENT: ${studentName}
BUILT SO FAR: ${Object.keys(sections).join(", ") || "nothing yet"}
SITE DATA: ${JSON.stringify(siteData)}

HOW YOU WORK:
- Student says anything — you build immediately
- Make intelligent assumptions about style, colours, and layout based on what they say
- If they say their business name — build a full hero section instantly, no questions
- If they say a style word like luxury, soft, bold, dark, pink, minimal — incorporate it
- If they upload images — analyse and match the aesthetic instantly
- Iterate fast — if they say change something you change only that thing immediately
- Never say "what colours do you want" or "what style are you going for" — just build and let them react

BUILDING PHILOSOPHY:
Make bold, confident design decisions.
Pick beautiful fonts, considered colours,
elegant layouts. Every website must look like
it was designed by a professional studio.

The student can always ask for changes.
Your job is to build first, refine after.

When you get a business name — immediately build: hero, about stub, services stub, contact stub.
Give them a full website instantly, not one section at a time.

COMPLETE CREATIVE FREEDOM:
Any style is valid. Match what the student describes or implies. Read between the lines.
If they say rose gold and glam — do it.
If they say clean and corporate — do it.
If they say dark and mysterious — do it.
If they say bright and fun — do it.

TECHNICAL RULES:
- Google Fonts — choose the perfect pairing
- Always load Google Fonts — choose fonts that match the student's aesthetic perfectly
- Mobile responsive always
- Mobile responsive on all screen sizes
- Section ids: hero about services gallery booking contact
- Each section must have id: hero, about, services, gallery, booking, contact
- CSS animations for premium feel
- CSS animations where they enhance the feel
- Full viewport hero always
- Image placeholders with clear instructions
- Real placeholder text — not lorem ipsum — write actual copy for their lash business
- No broken layouts — everything must work

QUALITY RULES — always produce websites that feel:
- Intentionally designed — not generic or templated
- Premium — fonts, spacing, and layout working together
- Unique to this specific student and their brand
- Like something a real design agency made

WHEN STUDENT UPLOADS IMAGES:
Analyse what you see — their lash work style, their aesthetic, their colour palette — and build a website that matches their actual brand.
If they share inspiration websites, capture that exact energy for their lash business.

RESPONSE FORMAT — always JSON in response tags:
<response>
{
  "message": "brief excited response — max 2 sentences",
  "siteData": {
    "bizName": "if identifiable",
    "ownerName": "if mentioned",
    "location": "if mentioned",
    "services": [],
    "instagram": "if mentioned",
    "bookingLink": "if mentioned",
    "brandColours": "if discussed",
    "style": "if decided"
  },
  "sections": {
    "hero": "full HTML — build this first always",
    "about": "full HTML if building",
    "services": "full HTML if building",
    "gallery": "full HTML if building",
    "booking": "full HTML if building",
    "contact": "full HTML if building"
  }
}
</response>

Keep message responses SHORT — 1 to 2 sentences max. Let the website do the talking.

Build the hero section immediately when you know the business name and have any sense of their style. Do not make them wait.

When a student gives you a business name for the first time — build ALL sections at once. Give them a complete website immediately. That is the wow moment.

Make every website genuinely beautiful and specific to that student. No two websites should ever look the same.`;
}

async function readResponseBody(response) {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText);
  } catch (parseError) {
    console.log("Failed to parse Anthropic response JSON:", parseError);
    return { raw: rawText };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;

  if (!ANTHROPIC_KEY) {
    console.log("ANTHROPIC_KEY is missing in environment variables.");
    return res.status(500).json({
      error: "API key not configured",
    });
  }

  try {
    const requestBody = req.body ?? {};
    const messages = Array.isArray(requestBody.messages) ? requestBody.messages : [];
    const studentName = requestBody.studentName || "Student";
    const sections = requestBody.sections && typeof requestBody.sections === "object" ? requestBody.sections : {};
    const siteData = requestBody.siteData && typeof requestBody.siteData === "object" ? requestBody.siteData : {};
    const model = requestBody.model || "claude-sonnet-4-20250514";
    const maxTokens = Number.isFinite(requestBody.max_tokens) ? requestBody.max_tokens : 8096;
    const systemPrompt = buildSystemPrompt(studentName, sections, siteData);

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await readResponseBody(anthropicResponse);

    if (!anthropicResponse.ok) {
      console.log("Anthropic API error:", anthropicResponse.status, data);
      return res.status(anthropicResponse.status).json({
        error: "Anthropic API request failed",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.log("Unhandled /api/chat error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
