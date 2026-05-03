export const runtime = "nodejs";
export const maxDuration = 90;

const STYLE_PREFIX =
  "Soft watercolor children's book illustration in a warm, dreamy bedtime style. Gentle pastel colors, magical and whimsical, no text or letters. Scene:";

type ImagesField = { type?: string; image_url?: { url?: string } }[];

function extractImageUrl(message: unknown): string | undefined {
  const m = message as { images?: ImagesField; content?: unknown };
  if (Array.isArray(m?.images)) {
    for (const it of m.images) {
      const url = it?.image_url?.url;
      if (typeof url === "string" && url) return url;
    }
  }
  if (Array.isArray(m?.content)) {
    for (const block of m.content as { type?: string; image_url?: { url?: string }; url?: string }[]) {
      if (block?.type === "image_url" && block.image_url?.url) return block.image_url.url;
      if (block?.type === "image" && block.url) return block.url;
    }
  }
  return undefined;
}

export async function GET(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return new Response("Missing OPENROUTER_API_KEY", { status: 500 });

  const { searchParams } = new URL(request.url);
  const prompt = (searchParams.get("prompt") || "").trim();
  if (!prompt) return new Response("missing prompt", { status: 400 });

  const styled = `${STYLE_PREFIX} ${prompt}`;

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3001",
        "X-Title": "Bedtime Story Magic",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
        messages: [{ role: "user", content: styled }],
        // Cap so the upfront budget check fits keys with low per-key spend limits.
        max_tokens: 4096,
      }),
    });
  } catch (err) {
    return new Response(`Network error: ${String(err)}`, { status: 502 });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return new Response(`OpenRouter ${upstream.status}: ${errText.slice(0, 400)}`, {
      status: 502,
    });
  }

  const data = await upstream.json().catch(() => null);
  const url = extractImageUrl((data as { choices?: { message?: unknown }[] })?.choices?.[0]?.message);
  if (!url) {
    return new Response(`No image in response: ${JSON.stringify(data).slice(0, 400)}`, {
      status: 502,
    });
  }

  const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const buffer = Buffer.from(dataUrlMatch[2], "base64");
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": dataUrlMatch[1],
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  if (url.startsWith("http")) {
    const r = await fetch(url, { headers: { Accept: "image/*" } });
    if (!r.ok || !r.body) return new Response(`Proxied ${r.status}`, { status: 502 });
    return new Response(r.body, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("content-type") || "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  }

  return new Response("Unrecognized image format", { status: 502 });
}
