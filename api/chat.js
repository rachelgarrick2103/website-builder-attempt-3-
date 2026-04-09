export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

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
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body ?? {}),
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
