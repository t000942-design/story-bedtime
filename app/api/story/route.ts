import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
  }

  const body = await request.json();
  const prompt = String(body?.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Please tell me what kind of story you'd like!" }, { status: 400 });
  }

  const system = `You are a gentle bedtime story writer for children ages 3-7. You write warm, soothing, magical stories with simple words that always end peacefully. Stories must be safe and kind — no scary violence, no inappropriate themes. If a child's request includes anything unsafe, gently steer toward a kind, magical alternative. You ALWAYS respond with valid JSON only — no markdown fences, no extra text.`;

  const user = `A child has asked for this story:

"${prompt}"

Write the story they asked for. Use 5 to 8 short pages. Each page is one paragraph of 2 to 4 sentences. End on a peaceful, sleepy note.

Respond in this exact JSON shape (and nothing else):
{
  "title": "A short magical title for the story",
  "pages": [
    {
      "text": "Paragraph text for this page.",
      "imagePrompt": "A concrete visual scene description for an illustrator (e.g. 'a tiny bunny waving at a glowing firefly in a moonlit forest'). Be specific and visual."
    }
  ]
}`;

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Bedtime Story Magic",
      },
      body: JSON.stringify({
        models: [
          "openai/gpt-oss-120b:free",
          "qwen/qwen3-next-80b-a3b-instruct:free",
          "google/gemma-3-27b-it:free",
        ],
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.9,
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Network error talking to OpenRouter", detail: String(err) },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `OpenRouter ${res.status}`, detail: text.slice(0, 500) },
      { status: 502 },
    );
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "No content from model" }, { status: 502 });
  }

  let parsed: unknown;
  try {
    // Strip code fences and extract the first {...} block (free models
    // sometimes wrap JSON in prose).
    const stripped = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    const slice = firstBrace !== -1 && lastBrace > firstBrace
      ? stripped.slice(firstBrace, lastBrace + 1)
      : stripped;
    parsed = JSON.parse(slice);
  } catch {
    return NextResponse.json({ error: "Model returned invalid JSON", raw: content }, { status: 502 });
  }

  const story = parsed as { title?: string; pages?: { text?: string; imagePrompt?: string }[] };
  if (!story?.title || !Array.isArray(story.pages) || story.pages.length === 0) {
    return NextResponse.json({ error: "Story missing title or pages", raw: parsed }, { status: 502 });
  }

  const safePages = story.pages
    .filter((p) => p && typeof p.text === "string")
    .map((p) => ({
      text: String(p.text).trim(),
      imagePrompt: String(p.imagePrompt ?? p.text ?? "").trim(),
    }));

  return NextResponse.json({ title: story.title, pages: safePages });
}
