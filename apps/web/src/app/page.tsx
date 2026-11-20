import Link from 'next/link';

const PILLARS = [
  {
    kicker: 'Feature A · Wearable Radar',
    title: 'A private resilience band',
    body: 'Continuous wearable telemetry folds into a Personal Resilience Index calculated strictly against your own rolling 30-day baseline — never a public ranking, never an automated diagnosis.',
    badge: 'AES-256 Vaults',
  },
  {
    kicker: 'Feature B · Ephemeral Acoustic',
    title: 'Listen that forgets',
    body: 'On-device acoustic signal detection operates in an ephemeral 10-second circular RAM buffer. If distress patterns repeat, a 7-field de-identified vector reaches human review. Audio is zero-filled.',
    badge: '0b Disk Persistence',
  },
  {
    kicker: 'Feature C · Population Health',
    title: 'Communities, not rows',
    body: 'K-anonymity (K≥10) aggregates neighborhoods into privacy-preserving pulses. Preventive care-gap notes are matched algorithmically and strictly gated by human clinicians before dispatch.',
    badge: 'K≥10 Strict Suppression',
  },
];

export default function LandingPage() {
  return (
    <div className="studio-bg grain relative min-h-screen text-sand-900 selection:bg-clay/20 selection:text-sand-900">
      {/* Editorial Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 border-b border-sand-300/40">
        <div className="flex items-center gap-3">
          <span className="font-serif text-3xl font-semibold tracking-tight text-sand-900">Ajna</span>
          <span className="hidden sm:inline-block rounded-full bg-sand-200/80 px-2.5 py-0.5 text-[10px] font-mono tracking-widest text-sand-700 uppercase">
            Platform v1.0
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/crisis-reviews"
            className="hidden sm:inline-flex rounded-full border border-sand-400/80 bg-sand-100/70 px-4 py-2 text-xs font-medium text-sand-800 hover:bg-sand-200 transition"
          >
            Staff Portal
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-sand-900 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-sand-50 transition hover:bg-sand-800 shadow-md active:scale-95"
          >
            Launch Prototype →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {/* Hero Section */}
        <section className="grid items-center gap-12 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-clay/30 bg-sand-100/80 px-3.5 py-1 text-xs font-mono text-clay-deep mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-clay animate-pulse" />
              <span>Future Health Digital Innovation Challenge · Hack2Scale</span>
            </div>

            <h1 className="font-serif text-5xl leading-[1.04] text-sand-900 md:text-6xl lg:text-7xl">
              Catching acute crises before they become cases.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-sand-700">
              Generic health apps passively log past workouts. Ajna is a predictive clinical interception
              platform: combining 30-day Gaussian biometric baselines, on-device acoustic distress
              detection, and K-anonymous community care gaps to catch acute disease decompensation
              <strong> 48 to 72 hours before hospitalization</strong>.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                className="rounded-full bg-clay px-6 py-3.5 text-sm font-semibold text-sand-50 shadow-md hover:bg-clay-deep transition-all active:scale-95"
              >
                Launch Interactive Showcase
              </Link>
              <Link
                href="/app/desk"
                className="rounded-full border border-sand-400 bg-sand-100/80 px-6 py-3.5 text-sm font-medium text-sand-800 hover:bg-sand-200 transition-all"
              >
                Clinical Review Desk
              </Link>
            </div>

            {/* Quick Guarantees Pill Bar */}
            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-sand-300/50 pt-6 text-xs text-sand-600 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> K≥10 Anonymity
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> 0b Audio Saved
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span> 100% Human-Gated
              </span>
            </div>
          </div>

          {/* Interactive Hero Visual Phone Mockup */}
          <div className="relative mx-auto">
            {/* Outer Glow */}
            <div className="absolute -inset-4 rounded-[3.5rem] bg-gradient-to-tr from-clay/20 to-amber-200/20 blur-2xl opacity-60 pointer-events-none" />

            {/* Phone Bezel */}
            <div className="relative h-[560px] w-[295px] overflow-hidden rounded-[3rem] bg-gradient-to-b from-[#3d352b] via-[#262018] to-[#15120e] p-[9px] shadow-[0_30px_90px_-20px_rgba(26,20,14,0.7),0_0_0_1px_rgba(255,255,255,0.15)]">
              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-3 z-30 h-6 w-24 -translate-x-1/2 rounded-full bg-black shadow flex items-center justify-between px-2.5">
                <div className="h-2 w-2 rounded-full bg-stone-900" />
                <span className="text-[7px] font-mono tracking-widest text-stone-500">AJNA</span>
                <div className="h-1.5 w-1.5 rounded-full bg-blue-950" />
              </div>

              {/* Screen Body */}
              <div className="flex h-full w-full flex-col justify-between rounded-[2.5rem] bg-sand-50 p-5 pt-8">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-sand-500">
                    <span>Member Telemetry</span>
                    <span className="text-emerald-700">Live</span>
                  </div>

                  <p className="mt-4 font-serif text-6xl text-sand-900">74</p>
                  <p className="text-xs font-medium text-sand-600 mt-0.5">
                    Personal Resilience Index
                  </p>

                  {/* Sparkline Visual */}
                  <div className="mt-5 flex h-16 items-end gap-1">
                    {[45, 52, 48, 56, 68, 62, 70, 65, 72, 74, 71, 74].map((n, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-sand-400/80 transition-all hover:bg-clay"
                        style={{ height: `${n}%` }}
                      />
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-sand-200 bg-sand-100/90 p-3 text-[11px] leading-relaxed text-sand-800">
                    <p className="font-semibold text-sand-900 mb-0.5">Rolling Baseline Analysis</p>
                    All wearable indicators within normal ±3 SD band. Advisory only.
                  </div>
                </div>

                <Link
                  href="/app"
                  className="w-full rounded-full bg-sand-900 py-2.5 text-center text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 transition"
                >
                  Enter Mobile Experience →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="grid gap-5 md:grid-cols-3 pt-6">
          {PILLARS.map((p) => (
            <article
              key={p.kicker}
              className="group rounded-3xl border border-sand-300/80 bg-sand-0/80 p-7 shadow-sm hover:border-sand-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-mono tracking-widest text-clay font-semibold">
                  {p.kicker}
                </p>
                <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[9px] font-mono text-sand-700">
                  {p.badge}
                </span>
              </div>
              <h2 className="mt-3 font-serif text-2xl font-medium text-sand-900 group-hover:text-clay transition-colors">
                {p.title}
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-sand-700">{p.body}</p>
            </article>
          ))}
        </section>

        {/* Feature Capabilities Grid */}
        <section className="mt-16 rounded-[2.5rem] border border-sand-300 bg-sand-50/90 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-clay font-semibold">
                Verified Verification Surface
              </p>
              <h2 className="font-serif text-3xl md:text-4xl text-sand-900 mt-1">
                Full-Loop Interactive Capabilities
              </h2>
            </div>
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-full bg-sand-900 px-5 py-2.5 text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 transition"
            >
              Launch Simulator
            </Link>
          </div>

          <ul className="mt-8 grid gap-4 text-xs text-sand-800 md:grid-cols-2">
            <li className="flex items-start gap-3 rounded-2xl bg-sand-0 p-4 border border-sand-200">
              <span className="text-base">🎙️</span>
              <div>
                <strong className="block text-sand-900 text-sm">On-Device Ephemeral Audio</strong>
                Acoustic analysis executes in a 10s circular RAM buffer. Raw audio is zero-filled in
                RAM; only a 7-field numerical vector reaches human review.
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-sand-0 p-4 border border-sand-200">
              <span className="text-base">📬</span>
              <div>
                <strong className="block text-sand-900 text-sm">Care-Gap Human Gating</strong>
                Community matchers draft targeted preventive recommendations. Reviewers must click
                approve before a message can ever land in Maya&apos;s inbox.
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-sand-0 p-4 border border-sand-200">
              <span className="text-base">🔒</span>
              <div>
                <strong className="block text-sand-900 text-sm">K-Anonymity (K≥10) Compliance</strong>
                Small communities with under 10 subjects are cryptographically masked. Tap any
                suppressed cell to inspect differential privacy rules.
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-2xl bg-sand-0 p-4 border border-sand-200">
              <span className="text-base">⚡</span>
              <div>
                <strong className="block text-sand-900 text-sm">Synchronous Dual Showcase</strong>
                Watch the phone simulator and the staff review desk operate side-by-side in real-time
                with live event bridging.
              </div>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
