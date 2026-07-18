import {ArrowLeft, ArrowRight, Check, Coins, FileDown, RefreshCcw, Sparkles} from 'lucide-react';

type PricingPageProps = {
  onBack: () => void;
  onStart: () => void;
};

const PACKS = [
  {
    name: 'Free',
    eyebrow: 'For your first test',
    price: '₩0',
    unit: 'No card required',
    credits: '3 tailoring credits',
    description: 'Try the complete CV tailoring workflow with three credits before choosing a paid plan.',
    features: ['Unlimited manual editing', 'Three job-specific AI tailoring runs', 'PDF exports and re-downloads'],
    featured: false,
    available: true,
  },
  {
    name: 'Credits',
    eyebrow: 'Pay once, use when needed',
    price: '₩10,000',
    unit: 'One-time purchase',
    credits: '10 tailoring credits',
    description: 'A flexible credit pack for tailoring your CV to several roles without a subscription.',
    features: ['Everything in Free', 'Ten job-specific tailoring runs', 'No recurring monthly fee'],
    featured: false,
    available: false,
  },
  {
    name: 'Pro',
    eyebrow: 'For an active job search',
    price: '₩22,000',
    unit: 'Per month',
    credits: '30 tailoring credits / month',
    description: 'A monthly plan for an active job search across multiple companies, roles, and CV versions.',
    features: ['Everything in Free', 'Thirty tailoring credits each month', 'Best value for an ongoing search'],
    featured: true,
    available: false,
  },
] as const;

export function PricingPage({onBack, onStart}: PricingPageProps) {
  return <main className="min-h-screen bg-black text-white">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <button type="button" className="focus-ring flex min-h-10 items-center gap-2 text-xs text-neutral-400 hover:text-white" onClick={onBack}>
          <ArrowLeft size={15} />Back to home
        </button>
        <button type="button" className="focus-ring flex min-h-10 items-center gap-2 bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200" onClick={onStart}>
          Start free<ArrowRight size={14} />
        </button>
      </div>
    </header>

    <section className="app-grid border-b border-white/10" aria-labelledby="pricing-title">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="flex max-w-3xl items-center gap-2 border border-white/10 bg-white/[.03] px-3 py-2 text-neutral-400 sm:w-fit">
          <Coins size={14} aria-hidden="true" />
          <p className="font-mono text-[9px] uppercase tracking-[.16em]">Preview pricing · Paid packs coming after MVP</p>
        </div>
        <h1 id="pricing-title" className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Start free, then choose what fits. <span className="text-neutral-500">Credits or Pro.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
          Test the full workflow with three free credits, buy a one-time pack when you need flexibility, or choose Pro for a focused monthly job search.
        </p>
      </div>
    </section>

    <section className="border-b border-white/10" aria-label="Credit packs">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-3">
          {PACKS.map(pack => <article key={pack.name} className={`relative flex flex-col bg-black p-6 md:p-7 ${pack.featured ? 'outline outline-1 -outline-offset-1 outline-white/40' : ''}`}>
            {pack.featured && <span className="absolute right-4 top-4 bg-white px-2.5 py-1 font-mono text-[8px] uppercase tracking-[.14em] text-black">Best value</span>}
            <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">{pack.eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl font-semibold">{pack.name}</h2>
            <div className="mt-7 flex items-end gap-2">
              <span className="font-display text-5xl font-semibold tracking-tight">{pack.price}</span>
              <span className="pb-1 text-xs text-neutral-500">KRW</span>
            </div>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-neutral-600">{pack.unit}</p>
            <div className="mt-6 border-y border-white/10 py-4">
              <p className="text-sm font-semibold text-neutral-200">{pack.credits}</p>
              <p className="mt-2 text-xs leading-5 text-neutral-500">{pack.description}</p>
            </div>
            <ul className="mt-5 flex-1 space-y-3">
              {pack.features.map(feature => <li key={feature} className="flex items-start gap-2.5 text-xs leading-5 text-neutral-400"><Check className="mt-0.5 shrink-0 text-neutral-300" size={14} />{feature}</li>)}
            </ul>
            {pack.available
              ? <button type="button" className="focus-ring mt-7 flex min-h-11 w-full items-center justify-center gap-2 bg-white px-4 py-3 text-xs font-semibold text-black hover:bg-neutral-200" onClick={onStart}><Sparkles size={14} />Start with 3 free credits</button>
              : <button type="button" disabled className="mt-7 min-h-11 w-full border border-white/10 bg-white/[.03] px-4 py-3 text-xs text-neutral-500">Coming soon</button>}
          </article>)}
        </div>

        <div className="mt-10 grid gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          <ValueNote icon={<RefreshCcw size={17} />} title="One clear unit">One credit is planned to cover one AI tailoring run for one job description.</ValueNote>
          <ValueNote icon={<FileDown size={17} />} title="Exports stay free">Editing, template switching, PDF export, and re-downloads use zero credits.</ValueNote>
          <ValueNote icon={<Sparkles size={17} />} title="No silent charges">The app will show the credit cost before starting a paid AI action.</ValueNote>
        </div>

        <p className="mt-8 text-center text-xs leading-5 text-neutral-600">
          This page presents the planned business model for the hackathon MVP. Checkout and payment collection are not enabled.
        </p>
      </div>
    </section>
  </main>;
}

function ValueNote({icon, title, children}: {icon: React.ReactNode; title: string; children: React.ReactNode}) {
  return <article className="bg-black p-5 md:p-6">
    <div className="grid h-9 w-9 place-items-center border border-white/15 bg-white/[.03] text-neutral-300">{icon}</div>
    <h2 className="mt-4 font-display text-base font-semibold">{title}</h2>
    <p className="mt-2 text-xs leading-5 text-neutral-500">{children}</p>
  </article>;
}
