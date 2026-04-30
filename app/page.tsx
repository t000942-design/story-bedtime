"use client";

import { useEffect, useRef, useState } from "react";

type Page = {
  text: string;
  imagePrompt: string;
  imageUrl: string;
  imageLoaded?: boolean;
  imageError?: boolean;
};

type Story = { title: string; pages: Page[] };

function imageUrl(prompt: string): string {
  // Same-origin proxy — browser blocks cross-origin image responses (ORB)
  // unless served from our own host.
  const seed = Math.floor(Math.random() * 1_000_000);
  const params = new URLSearchParams({ prompt, seed: String(seed) });
  return `/api/image?${params.toString()}`;
}

const EXAMPLES = [
  "🐰 A bunny who learns how to fly",
  "🐲 A tiny dragon who's afraid of the dark",
  "🚀 A friendly robot exploring rainbow planets",
  "🧜 A mermaid making friends with a starfish",
  "🦊 A clever fox solving a forest mystery",
  "🐼 A panda who finds a magical music box",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState<Story | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const storyRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  // Prefetch the next page's image so it's ready when the user clicks Next.
  useEffect(() => {
    const next = story?.pages[pageIdx + 1];
    if (next?.imageUrl) {
      const img = new window.Image();
      img.src = next.imageUrl;
    }
  }, [story, pageIdx]);

  async function generateStory(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    stopReading();
    setError(null);
    setStory(null);
    setPageIdx(0);
    setGenerating(true);
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data?.title || !Array.isArray(data.pages)) {
        throw new Error(data?.error || "Could not write a story this time");
      }
      const newStory: Story = {
        title: String(data.title),
        pages: data.pages.map((p: { text: string; imagePrompt: string }) => ({
          text: p.text,
          imagePrompt: p.imagePrompt,
          imageUrl: imageUrl(p.imagePrompt),
        })),
      };
      setStory(newStory);
      setTimeout(
        () => storyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );

      // Soft-prefetch only the next page so we don't hammer Pollinations with N parallel
      // generations (their servers create images on demand). Subsequent pages load
      // when the user navigates to them.
      const next = newStory.pages[1];
      if (next) {
        const img = new window.Image();
        img.src = next.imageUrl;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    generateStory(prompt);
  }

  async function readAloud() {
    if (!story) return;
    stopReading();
    const text = `${story.title}. ${story.pages.map((p) => p.text).join(" ")}`;
    setAudioLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Voice ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audio.onended = () => {
        setSpeaking(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };
      audio.onerror = () => setSpeaking(false);
      audioRef.current = audio;
      await audio.play();
      setSpeaking(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read aloud");
    } finally {
      setAudioLoading(false);
    }
  }

  function stopReading() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setSpeaking(false);
  }

  function useExample(text: string) {
    const cleaned = text.replace(/^[^\sA-Za-z]+\s*/, "");
    setPrompt(cleaned);
    textareaRef.current?.focus();
  }

  const currentPage = story?.pages[pageIdx];

  return (
    <main className="flex flex-col items-center w-full max-w-3xl mx-auto px-4 py-10 sm:py-16">
      {/* Header */}
      <header className="text-center mb-8 pop-in">
        <h1 className="font-display text-5xl sm:text-6xl font-bold text-white drop-shadow-[0_4px_20px_rgba(255,200,120,0.5)]">
          ✨ Bedtime Story Magic ✨
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-yellow-100/90">
          Tell me what kind of story you'd love tonight…
        </p>
      </header>

      {/* Chatbox */}
      <section className="glass rounded-3xl p-5 sm:p-6 w-full pop-in">
        <form onSubmit={handleSubmit}>
          <label className="font-display font-semibold text-yellow-100 text-lg mb-2.5 block">
            What story shall I tell?
          </label>
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A brave little dragon who learns to share his sparkly treasure with the woodland creatures…"
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl bg-white/15 border border-white/25 px-5 py-4 text-lg text-white placeholder-white/50 focus:outline-none focus:ring-4 focus:ring-yellow-300/50 focus:border-yellow-200/60 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                generateStory(prompt);
              }
            }}
          />

          {/* Examples */}
          <div className="mt-3">
            <div className="text-yellow-100/75 text-sm mb-2">Need ideas? Tap one ✨</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => useExample(ex)}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-yellow-50 text-sm font-display rounded-full px-3.5 py-1.5 transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="glow-btn mt-5 w-full font-display font-bold text-2xl text-purple-900 rounded-3xl py-5 bg-gradient-to-r from-yellow-200 via-pink-200 to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "✨ Sprinkling story dust…" : "✨ Tell me a story! ✨"}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-300/20 border border-rose-200/40 text-rose-50 px-4 py-3 text-center">
            {error}
          </div>
        )}
      </section>

      {/* Picture-book viewer */}
      {story && currentPage && (
        <article
          ref={storyRef}
          className="glass rounded-3xl p-5 sm:p-8 w-full mt-8 pop-in"
        >
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-yellow-100 text-center mb-5 drop-shadow-[0_2px_10px_rgba(255,200,120,0.5)]">
            🌙 {story.title} 🌙
          </h2>

          <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-purple-900/40 border border-white/20 flex items-center justify-center mb-5 relative">
            {!currentPage.imageError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`page-${pageIdx}`}
                src={currentPage.imageUrl}
                alt={currentPage.imagePrompt}
                onLoad={() =>
                  setStory((s) => {
                    if (!s) return s;
                    const next = s.pages.slice();
                    next[pageIdx] = { ...next[pageIdx], imageLoaded: true };
                    return { ...s, pages: next };
                  })
                }
                onError={() =>
                  setStory((s) => {
                    if (!s) return s;
                    const next = s.pages.slice();
                    next[pageIdx] = { ...next[pageIdx], imageError: true };
                    return { ...s, pages: next };
                  })
                }
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                  currentPage.imageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
            {!currentPage.imageLoaded && !currentPage.imageError && (
              <div className="flex flex-col items-center gap-3 text-yellow-100/90 z-10">
                <div className="text-5xl animate-pulse">🎨</div>
                <div className="text-sm">Painting this page…</div>
              </div>
            )}
            {currentPage.imageError && (
              <div className="text-center text-yellow-100/80 px-4 z-10">
                <div className="text-5xl mb-2">🎨</div>
                <div className="text-sm">The illustration is napping — read on!</div>
              </div>
            )}
          </div>

          <p className="text-white/95 text-lg sm:text-xl leading-relaxed text-center min-h-[4rem]">
            {currentPage.text}
          </p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
              disabled={pageIdx === 0}
              className="glow-btn bg-white/15 text-white border border-white/25 font-display font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <div className="text-yellow-100/85 font-display text-sm">
              Page {pageIdx + 1} of {story.pages.length}
            </div>
            <button
              onClick={() => setPageIdx((i) => Math.min(story.pages.length - 1, i + 1))}
              disabled={pageIdx >= story.pages.length - 1}
              className="glow-btn bg-white/15 text-white border border-white/25 font-display font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {!speaking ? (
              <button
                onClick={readAloud}
                disabled={audioLoading}
                className="glow-btn bg-gradient-to-r from-pink-300 to-yellow-200 text-purple-900 font-display font-bold text-lg px-6 py-3 rounded-2xl disabled:opacity-70 disabled:cursor-wait"
              >
                {audioLoading ? "🎙️ Warming up the storyteller…" : "🔊 Read Aloud"}
              </button>
            ) : (
              <button
                onClick={stopReading}
                className="glow-btn bg-gradient-to-r from-rose-300 to-orange-200 text-purple-900 font-display font-bold text-lg px-6 py-3 rounded-2xl"
              >
                ⏹ Stop
              </button>
            )}
            <button
              onClick={() => generateStory(prompt)}
              disabled={generating || !prompt.trim()}
              className="glow-btn bg-gradient-to-r from-indigo-300 to-purple-200 text-purple-900 font-display font-bold text-lg px-6 py-3 rounded-2xl disabled:opacity-50"
            >
              🔄 New Story
            </button>
          </div>
        </article>
      )}

      <footer className="mt-12 text-center text-yellow-100/60 text-sm">
        Sweet dreams ✨
      </footer>
    </main>
  );
}
