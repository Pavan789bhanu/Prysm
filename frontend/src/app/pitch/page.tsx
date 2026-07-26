import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Gem,
  LineChart,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    icon: Zap,
    title: "Seconds to insight",
    body: "Upload CSV → ask in English → get executed charts, findings, and exportable code.",
  },
  {
    icon: LineChart,
    title: "Not just code — proof",
    body: "Prysm runs the generated pipeline and renders Plotly charts live in the product.",
  },
  {
    icon: Shield,
    title: "Demo-safe reliability",
    body: "Offline demo mode, async jobs, rate limits, and Docker packaging for stakeholder rooms.",
  },
  {
    icon: Users,
    title: "Built for buyers",
    body: "Executive summaries, presentation mode, and HTML reports your board can take home.",
  },
];

export default function PitchPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-white">
            <span className="bg-sunset flex h-8 w-8 items-center justify-center rounded-lg">
              <Gem className="h-4 w-4 text-white" />
            </span>
            Prysm
          </Link>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Start demo</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Investor & stakeholder brief
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            AI data analysis that{" "}
            <span className="text-gradient">shows the answer</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Prysm turns raw CSVs into executive findings and live charts through a
            multi-agent pipeline — plan, generate, execute, visualize — ready for
            fundraising demos and early customer pilots.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg">
                Launch the product
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard/analyze">
              <Button size="lg" variant="outline">
                Go to one-click demo
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2">
          {pillars.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="mt-16">
          <Card className="border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 to-rose-500/5">
            <CardContent className="grid gap-6 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Tomorrow&apos;s demo script</h2>
                <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                    Register → open Analyze → click <strong>One-click demo</strong>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                    Show executive summary + live Plotly charts
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                    Hit <strong>Present</strong> for full-screen stakeholder mode
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                    Export the HTML report and leave it with the room
                  </li>
                </ol>
              </div>
              <div className="glass-tile rounded-2xl p-5 text-sm text-muted-foreground">
                <p className="font-medium text-white">Why this converts</p>
                <p className="mt-2">
                  Competitors stop at generated notebooks. Prysm closes the loop:
                  agents + execution + charts + board-ready narrative in one product
                  surface.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
