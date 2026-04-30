export const runtime = "nodejs";
export const maxDuration = 60;

// Elli — soft young female voice; gentle and good for bedtime stories.
const VOICE_ID = "MF3mGyEYCl7XYWbV9V6O";

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response("Missing ELEVENLABS_API_KEY", { status: 500 });

  const body = await request.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim().slice(0, 4500);
  if (!text) return new Response("missing text", { status: 400 });

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      },
    );
  } catch (err) {
    return new Response(`network error: ${String(err)}`, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    return new Response(`ElevenLabs ${upstream.status}: ${errText.slice(0, 300)}`, {
      status: 502,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
