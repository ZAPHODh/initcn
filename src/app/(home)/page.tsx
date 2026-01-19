import Link from "next/link";
import { ArrowRight, Code2, Package, Rocket, Zap } from "lucide-react";
import {
  AnimatedHero,
  AnimatedFadeUp,
  AnimatedSection,
  AnimatedSectionScale,
  AnimatedStaggerSection,
  AnimatedStats,
} from "./animated";

export default function HomePage() {
  const stats = [
    { value: "Auth", label: "Otp authentication" },
    { value: "I18n", label: "with next-international" },
    { value: "Payments", label: "With stripe" },
    { value: "More", label: "Coming soon" },
    
  ];

  const features = [
    {
      icon: Rocket,
      title: "Ready-to-Use Configs",
      description:
        "Drop-in authentication configurations ready to use. More infrastructure patterns coming soon.",
    },
    {
      icon: Package,
      title: "Registry-Based",
      description:
        "Built on the shadcn registry architecture. Install configs like components with a single command.",
    },
    {
      icon: Code2,
      title: "Full Control",
      description:
        "Copy the code into your project. Customize everything. No hidden dependencies or black boxes.",
    },
    {
      icon: Zap,
      title: "Best Practices",
      description:
        "Production-ready patterns with TypeScript, Server Actions, and modern Next.js App Router.",
    },
  ];

/*   const examples = [
    {
      name: "OTP Authentication",
      command: "npx shadcn@latest add https://initcn.dev/r/auth-otp-prisma",
      description: "Complete OTP auth with Prisma, email sending, and rate limiting",
      available: true,
    },
    {
      name: "Internationalization",
      command: "npx shadcn@latest add https://initcn.dev/r/i18n-next-international",
      description: "Type-safe i18n with next-international, Server Components support, and automatic routing",
      available: true,
    },
    {
      name: "Payment Integration",
      command: "npx shadcn@latest add https://initcn.dev/r/payments-stripe",
      description: "Stripe integration with webhooks and subscription management",
      available: false,
    },
  ]; */

  return (
    <main className="flex flex-col">
      <section className="mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
        <AnimatedHero className="mx-auto max-w-4xl text-center space-y-8">
          <AnimatedFadeUp>
            <div className="inline-flex items-center gap-2 rounded-full border bg-fd-secondary/50 px-4 py-1.5 text-sm text-fd-muted-foreground">
              <Package className="size-4" />
              Infrastructure as a Registry
            </div>
          </AnimatedFadeUp>

          <AnimatedFadeUp>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Ship faster with
              <br />
              <span className="text-fd-primary">ready-made infrastructure</span>
            </h1>
          </AnimatedFadeUp>

          <AnimatedFadeUp>
            <p className="mx-auto max-w-2xl text-lg text-fd-muted-foreground sm:text-xl">
              Stop copying auth boilerplate from tutorial to tutorial.
              Install production-ready authentication configs in seconds.
            </p>
          </AnimatedFadeUp>

          <AnimatedFadeUp className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-6 py-3 text-sm font-medium text-fd-primary-foreground hover:bg-fd-primary/90 transition-colors"
            >
              Browse Configs
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-fd-border px-6 py-3 text-sm font-medium hover:bg-fd-secondary/50 transition-colors"
            >
              View Documentation
            </Link>
          </AnimatedFadeUp>
        </AnimatedHero>
      </section>

      <AnimatedSection className="mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <AnimatedStats stats={stats} />
      </AnimatedSection>

      <AnimatedSectionScale className="mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            One command to rule them all
          </h2>
          <p className="text-lg text-fd-muted-foreground">
            Install infrastructure configs just like shadcn/ui components
          </p>
        </div>

     {/*    <div className="mx-auto max-w-3xl space-y-8">
          {examples.map((example) => (
            <AnimatedSection key={example.name}>
              <div className={`rounded-lg border bg-fd-card p-6 space-y-3 ${!example.available ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{example.name}</h3>
                      {example.available ? (
                        <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-fd-secondary px-2 py-0.5 text-xs font-medium text-fd-muted-foreground">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-fd-muted-foreground mt-1">
                      {example.description}
                    </p>
                  </div>
                </div>
                <div className="rounded-md bg-fd-secondary/50 border p-4 font-mono text-sm overflow-x-auto">
                  {example.command}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div> */}
      </AnimatedSectionScale>

      <AnimatedSection className="w-full py-24 md:py-32 bg-fd-secondary/30">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Why initcn?
          </h2>
          <p className="text-lg text-fd-muted-foreground">
            Built for developers who want speed without sacrificing control
          </p>
        </div>

          <AnimatedStaggerSection className="grid gap-8 sm:grid-cols-2 max-w-5xl mx-auto">
            {features.map((feature) => (
              <AnimatedFadeUp key={feature.title}>
                <div className="rounded-lg border bg-fd-card p-6 space-y-3 h-full hover:border-fd-primary/50 transition-colors">
                  <div className="rounded-md bg-fd-primary/10 w-12 h-12 flex items-center justify-center">
                    <feature.icon className="size-6 text-fd-primary" />
                  </div>
                  <h3 className="font-semibold text-xl">{feature.title}</h3>
                  <p className="text-fd-muted-foreground">{feature.description}</p>
                </div>
              </AnimatedFadeUp>
            ))}
          </AnimatedStaggerSection>
        </div>
      </AnimatedSection>

      <AnimatedSectionScale className="mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center space-y-8 rounded-2xl border bg-gradient-to-b from-fd-secondary/50 to-fd-secondary/20 p-12 md:p-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to ship faster?
          </h2>
          <p className="text-lg text-fd-muted-foreground">
            Browse our collection of infrastructure configs and start building.
          </p>
          <Link
            href="/docs"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-fd-primary px-8 py-4 text-base font-medium text-fd-primary-foreground hover:bg-fd-primary/90 transition-colors"
          >
            Get Started
            <ArrowRight className="size-5" />
          </Link>
        </div>
      </AnimatedSectionScale>
    </main>
  );
}
