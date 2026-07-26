import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Gem,
  LineChart,
  Play,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const script = [
  {
    title: "Open the pitch, then launch",
    body: "Start on this page, register in under a minute, and land in the dashboard.",
  },
  {
    title: "One-click demo",
    body: "Analyze → One-click demo loads sample sales data and runs the full agent pipeline.",
  },
  {
    title: "Show proof, not slides",
    body: "Walk executive findings, live Plotly charts, then hit Present for full-screen mode.",
  },
  {
    title: "Leave the artifact",
    body: "Export the HTML stakeholder report so funders can reopen the story after the meeting.",
  },
];

export default function PitchPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-8rem] top-[-4rem] h-96 w-96 bg-fuchsia-600/35" />
        <div className="orb right-[-6rem] top-[8rem] h-80 w-80 bg-rose-500/30" />
        <div className="orb bottom-[-10rem] left-1/3 h-96 w-96 bg-violet-600/25" />
      </div>

      <header className="mx-auto mt-4 flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-white">
          <span className="bg-sunset flex h-8 w-8 items-center justify-center rounded-lg">
            <Gem className="h-4 w-4 text-white" />
          </span>
          Prysm
        </Link>
        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Start demo</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6">
        <section className="mx-auto max-w-4xl text-center">
          <p className="animate-float-soft text-5xl font-bold tracking-tight text-white sm:text-7xl">
            Prysm
          </p>
          <p className="mt-3 text-sm uppercase tracking-[0.28em] text-accent">
            Investor &amp; stakeholder brief
          </p>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            AI analysis that{" "}
            <span className="text-gradient">closes the loop</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Upload a CSV, ask in English, and Prysm plans, generates, executes, and
            visualizes — so the room sees live charts and board-ready findings, not a
            notebook dump.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="min-w-[200px]">
                Launch product demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/analyze">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                <Play className="h-4 w-4" />
                Go to one-click demo
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Seconds to insight",
              body: "Sample data + agents + execution in one click.",
            },
            {
              icon: LineChart,
              title: "Proof on screen",
              body: "Plotly charts rendered from the generated pipeline.",
            },
            {
              icon: Shield,
              title: "Demo-safe",
              body: "Offline demo mode works without an OpenAI key.",
            },
          ].map((item) => (
            <div key={item.title} className="glass-panel rounded-2xl p-6 text-left">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-lg font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-2xl font-bold text-white">Tomorrow&apos;s walkthrough</h2>
          </div>
          <ol className="grid gap-4 md:grid-cols-2">
            {script.map((step, index) => (
              <li
                key={step.title}
                className="glass-tile flex gap-4 rounded-2xl p-5"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 overflow-hidden rounded-3xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/15 via-transparent to-rose-500/10 p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Why this converts in the room</h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {[
                  "Competitors stop at generated notebooks — Prysm executes and shows charts.",
                  "Executive summary + Present mode keeps the narrative board-ready.",
                  "Exportable HTML report is the leave-behind funders actually reopen.",
                  "Docker + demo mode means the walkthrough stays reliable under pressure.",
                ].map((line) => (
                  <li key={line} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <p className="text-sm uppercase tracking-[0.2em] text-accent">Ask in the room</p>
              <p className="mt-3 text-xl font-semibold text-white">
                “What if every analyst could go from CSV to board story in one click?”
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                That is the Prysm bet — multi-agent planning, trusted execution, and a
                product surface designed for buyers, not just builders.
              </p>
              <Link href="/register" className="mt-6 inline-flex">
                <Button>
                  Begin the live demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
