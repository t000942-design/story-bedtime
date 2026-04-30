// Deterministic pseudo-random so server and client render identically (no hydration mismatch).
function pr(i: number, mult: number, offset = 1) {
  const x = Math.sin(i * mult + offset) * 10000;
  return x - Math.floor(x);
}

export default function Background() {
  const stars = Array.from({ length: 70 }, (_, i) => ({
    left: `${pr(i, 12.9898) * 100}%`,
    top: `${pr(i, 78.233) * 100}%`,
    size: 1.5 + pr(i, 43.5453) * 2.8,
    delay: pr(i, 17.123) * 4,
    duration: 2 + pr(i, 23.456) * 4,
  }));

  const clouds = [
    { top: "12%", delay: "0s",   duration: "60s", dir: "drift-right" },
    { top: "32%", delay: "-25s", duration: "75s", dir: "drift-left"  },
    { top: "55%", delay: "-10s", duration: "90s", dir: "drift-right" },
    { top: "72%", delay: "-40s", duration: "70s", dir: "drift-left"  },
  ];

  const flyers = [
    { emoji: "🦉", top: "18%", delay: "0s",   duration: "32s", anim: "fly-across" },
    { emoji: "🦋", top: "40%", delay: "-12s", duration: "28s", anim: "fly-back"   },
    { emoji: "🕊️", top: "62%", delay: "-20s", duration: "36s", anim: "fly-across" },
    { emoji: "🎈", top: "8%",  delay: "-5s",  duration: "44s", anim: "fly-back"   },
  ];

  const bobbers = [
    { emoji: "✨", left: "8%",  top: "30%", delay: "0s", duration: "4s" },
    { emoji: "⭐", left: "85%", top: "48%", delay: "-2s", duration: "5s" },
    { emoji: "💫", left: "15%", top: "70%", delay: "-1s", duration: "6s" },
    { emoji: "✨", left: "78%", top: "22%", delay: "-3s", duration: "4.5s" },
  ];

  const shootingStars = [
    { left: "5%",  top: "10%", delay: "3s",  duration: "8s" },
    { left: "30%", top: "5%",  delay: "11s", duration: "9s" },
  ];

  const sparkles = Array.from({ length: 14 }, (_, i) => ({
    left: `${pr(i, 33.111, 5) * 100}%`,
    top: `${pr(i, 51.732, 7) * 100}%`,
    delay: pr(i, 11.234, 3) * 5,
    duration: 3 + pr(i, 19.876, 9) * 3,
  }));

  return (
    <div className="bg-decor" aria-hidden="true">
      {/* Stars */}
      {stars.map((s, i) => (
        <span
          key={`star-${i}`}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}

      {/* Moon */}
      <div className="moon">🌙</div>

      {/* Clouds */}
      {clouds.map((c, i) => (
        <span
          key={`cloud-${i}`}
          className="cloud"
          style={{
            top: c.top,
            animationName: c.dir,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        >
          ☁️
        </span>
      ))}

      {/* Flying creatures */}
      {flyers.map((f, i) => (
        <span
          key={`fly-${i}`}
          className="flyer"
          style={{
            top: f.top,
            animation: `${f.anim} ${f.duration} linear infinite`,
            animationDelay: f.delay,
          }}
        >
          {f.emoji}
        </span>
      ))}

      {/* Bobbing sparkles */}
      {bobbers.map((b, i) => (
        <span
          key={`bob-${i}`}
          className="bobber"
          style={{
            left: b.left,
            top: b.top,
            animationDuration: b.duration,
            animationDelay: b.delay,
          }}
        >
          {b.emoji}
        </span>
      ))}

      {/* Tiny background sparkles */}
      {sparkles.map((s, i) => (
        <span
          key={`spk-${i}`}
          className="sparkle"
          style={{
            left: s.left,
            top: s.top,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        >
          ✦
        </span>
      ))}

      {/* Shooting stars */}
      {shootingStars.map((s, i) => (
        <span
          key={`shoot-${i}`}
          className="shooting-star"
          style={{
            left: s.left,
            top: s.top,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}
