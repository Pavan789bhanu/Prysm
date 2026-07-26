import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Database,
  Gem,
  Layers,
  LineChart,
  ScatterChart,
  Shield,
  Sparkles,
  TerminalSquare,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Upload,
    title: "Upload any CSV",
    description:
      "Drop a dataset and Prysm instantly profiles your columns, types, and structure — no setup, no schema files.",
  },
  {
    icon: BrainCircuit,
    title: "Ask in plain English",
    description:
      "Describe the outcome you want. A planner agent decides which specialists to deploy and in what order.",
  },
  {
    icon: LineChart,
    title: "Live charts & code",
    description:
      "Prysm generates and executes a Python pipeline — you get Plotly charts in the dashboard plus export-ready code.",
  },
  {
    icon: Shield,
    title: "Secure by design",
    description:
      "JWT authentication, per-user storage, and isolated datasets keep your data private and yours alone.",
  },
  {
    icon: Wand2,
    title: "Multi-agent reasoning",
    description:
      "Preprocessing, statistics, and visualization agents collaborate, then a combiner merges their work.",
  },
  {
    icon: Layers,
    title: "Full history",
    description:
      "Every query, plan, chart, and generated script is saved so you can revisit and refine anytime.",
  },
];

const steps = [
  {
    title: "Upload a dataset",
    description: "Add a CSV — or load the built-in sample for a one-click demo.",
    icon: Database,
  },
  {
    title: "Describe your goal",
    description: "Ask a question the way you'd ask a data scientist.",
    icon: Sparkles,
  },
  {
    title: "Agents plan & execute",
    description: "Specialist agents preprocess, analyze, visualize, and run the code.",
    icon: BrainCircuit,
  },
  {
    title: "See charts & pipeline",
    description: "Review live Plotly charts and a polished Python script.",
    icon: TerminalSquare,
  },
];

const agents = [
  { name: "Planner", desc: "Designs the analysis strategy", icon: BrainCircuit },
  { name: "Preprocessing", desc: "Cleans & transforms with pandas", icon: Database },
  { name: "Statistics", desc: "Regression & hypothesis tests", icon: LineChart },
  { name: "Visualization", desc: "Interactive Plotly charts", icon: ScatterChart },
  { name: "Combiner", desc: "Merges into one clean script", icon: Layers },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className="bg-sunset flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_6px_20px_rgba(236,72,153,0.45)]">
        <Gem className="h-5 w-5 text-white" />
      </span>
      <span className="text-lg text-white">Prysm</span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-8rem] top-[-6rem] h-96 w-96 bg-fuchsia-600/40" />
        <div className="orb right-[-6rem] top-[10rem] h-80 w-80 bg-rose-500/40" />
        <div className="orb bottom-[-8rem] left-1/3 h-96 w-96 bg-violet-600/30" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto mt-4 flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 backdrop-blur-xl sm:px-6">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-white">Features</a>
            <a href="#how" className="transition-colors hover:text-white">How it works</a>
            <a href="#agents" className="transition-colors hover:text-white">Agents</a>
            <Link href="/pitch" className="transition-colors hover:text-white">Pitch</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 text-center sm:px-6 lg:pt-28">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-accent" />
            AI-powered automated data analysis
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
            Turn raw data into insight,{" "}
            <span className="text-gradient">refracted by AI agents</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Prysm orchestrates specialized AI agents to plan, preprocess, analyze, and
            visualize your data. Upload a CSV, ask a question, and get live charts plus a
            complete Python analysis pipeline.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="min-w-[200px]">
                Start analyzing free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                Sign in to dashboard
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> No credit card</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> Private by default</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-400" /> Live charts + exportable code</span>
          </div>

          {/* Floating glass product preview */}
          <div className="animate-float-soft mx-auto mt-16 max-w-3xl">
            <div className="glass-panel rounded-2xl p-1.5 text-left">
              <div className="rounded-xl bg-[#0c0816]/80 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
                  <span className="ml-3 text-xs text-muted-foreground">prysm · analysis_pipeline.py</span>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {["Planner", "Preprocessing", "Statistics", "Visualization", "Combiner"].map(
                    (a, i) => (
                      <span
                        key={a}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-fuchsia-100"
                      >
                        <span className="bg-sunset flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold text-white">
                          {i + 1}
                        </span>
                        {a}
                      </span>
                    ),
                  )}
                </div>
                <pre className="overflow-hidden rounded-lg bg-black/40 p-4 font-mono text-xs leading-6 text-slate-200">
{`import pandas as pd
import plotly.express as px

df = pd.read_csv("sales.csv")
df = df.dropna().drop_duplicates()

monthly = df.groupby("month")["revenue"].sum()
fig = px.line(monthly, title="Revenue trend")
fig.show()  # generated by Prysm`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="glass grid grid-cols-2 gap-6 rounded-2xl px-8 py-8 text-center md:grid-cols-4">
            {[
              ["5", "Specialized agents"],
              ["< 60s", "To a full pipeline"],
              ["100%", "Python, copy-ready"],
              ["0", "Lines of boilerplate"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-gradient text-3xl font-bold">{value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need for AI-assisted analytics
            </h2>
            <p className="mt-3 text-muted-foreground">
              One workspace, from messy CSV to a polished analysis pipeline.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass glass-hover group rounded-2xl p-6"
              >
                <div className="bg-sunset mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-[0_6px_20px_rgba(236,72,153,0.35)]">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              From question to pipeline in four steps
            </h2>
            <p className="mt-3 text-muted-foreground">
              A professional workflow that feels effortless.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.title} className="glass relative rounded-2xl p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-white/6 text-fuchsia-200">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-5xl font-bold leading-none text-white/10">
                    {index + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Agent pipeline */}
        <section id="agents" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="glass-panel rounded-3xl p-8 sm:p-12">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                A team of agents, working in sequence
              </h2>
              <p className="mt-3 text-muted-foreground">
                Each agent is a specialist. Together, they build your analysis end to end.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
              {agents.map((agent, i) => (
                <div key={agent.name} className="flex flex-1 items-center gap-3 lg:flex-col">
                  <div className="glass-strong flex flex-1 flex-col items-center rounded-2xl px-4 py-6 text-center lg:w-full">
                    <div className="bg-sunset mb-3 flex h-11 w-11 items-center justify-center rounded-xl">
                      <agent.icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-semibold text-white">{agent.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{agent.desc}</p>
                  </div>
                  {i < agents.length - 1 ? (
                    <ArrowRight className="h-5 w-5 shrink-0 rotate-90 text-fuchsia-300/60 lg:rotate-0" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
          <div className="glass-panel relative overflow-hidden rounded-3xl px-6 py-16 text-center">
            <div className="orb left-1/2 top-0 h-64 w-64 -translate-x-1/2 bg-fuchsia-500/40" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Ready to refract your data into insight?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Create a free account, upload your first dataset, and let your AI
                analyst team get to work.
              </p>
              <Link href="/register" className="mt-8 inline-block">
                <Button size="lg" className="min-w-[220px]">
                  Create your free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Wordmark />
          <p>AI-powered automated data analysis · Built with multi-agent AI</p>
        </div>
      </footer>
    </div>
  );
}
