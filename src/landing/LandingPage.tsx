import {ArrowRight, Check, Cpu, Download, Globe, Lock, Mic, ScanSearch, ShieldCheck, Sparkles} from 'lucide-react';
import {LOCAL_AI_ENABLED} from '../gemma/config';

type LandingPageProps = {
  onStart: () => void;
  onPricing: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

const FEATURES = [
  ...(LOCAL_AI_ENABLED ? [{
    icon: Cpu,
    title: 'Private on-device mode',
    body: 'Run the whole analysis locally in your browser with WebGPU. In Private Mode nothing leaves your device — no upload, no account, no trace.',
  }] : []),
  {
    icon: ShieldCheck,
    title: 'Truthful, grounded edits',
    body: 'Every suggestion is tied to evidence already in your CV. The copilot never invents employers, dates, or metrics, and each change is reversible.',
  },
  {
    icon: Globe,
    title: 'Cited company research',
    body: 'Build a briefing on the company and role from live Google results — every claim carries a source link. Only public job details are ever sent.',
  },
  {
    icon: ScanSearch,
    title: 'Real job-fit analysis',
    body: 'Paste a job URL or description. See verified matches and honest gaps between your experience and what the role actually asks for.',
  },
  {
    icon: Mic,
    title: 'Grounded interview kit',
    body: 'Likely questions, smart questions to ask, and a 30-second pitch — drawn only from your CV, rejected if anything is fabricated.',
  },
  {
    icon: Download,
    title: 'Print-ready PDF export',
    body: 'Four polished, ATS-friendly templates. What you see in the editor is exactly what exports — paper-white, high-contrast, ready to send.',
  },
] as const;

const STEPS = [
  {label: 'Edit', title: 'Build your CV', body: 'Fill a structured editor or click any field on the live preview. Everything autosaves locally.'},
  {label: 'Target', title: 'Add a job', body: 'Paste a job URL or the description. We fetch and sanitize the posting for a fair comparison.'},
  {label: 'Review', title: 'Approve grounded edits', body: 'The copilot proposes evidence-backed improvements. You accept or reject each one — nothing changes silently.'},
  {label: 'Export', title: 'Ship a polished PDF', body: 'Switch templates, tune density, and export a clean, ATS-ready document in a click.'},
] as const;

const FAQ = [
  {
    q: 'Do I need an account?',
    a: 'No. The editor, analysis, research, interview prep, and PDF export all work without signing in. Cloud saving is a separate, optional, explicit action.',
  },
  {
    q: 'What actually gets sent to the cloud?',
    a: LOCAL_AI_ENABLED
      ? 'In the recommended cloud path, your name, email, phone, location, and links are stripped before employment content and job text are sent. Private Mode sends nothing at all — the model runs on your device.'
      : 'Your name, email, phone, location, and links are stripped before employment content and job text are sent for analysis. Cloud saving remains a separate, explicit action.',
  },
  {
    q: 'Will it make things up to improve my CV?',
    a: 'No. Suggestions must be grounded in evidence already present in your CV. Anything that cannot be verified is rejected rather than guessed.',
  },
  ...(LOCAL_AI_ENABLED ? [{
    q: 'What do I need for Private Mode?',
    a: 'A WebGPU-capable browser such as recent Chrome or Edge. The on-device model downloads once (about 2 GB) only after you explicitly activate it, then stays cached locally.',
  }] : []),
] as const;

function Eyebrow({children}: {children: React.ReactNode}) {
  return <p className="font-mono text-[10px] uppercase tracking-[.22em] text-neutral-500">{children}</p>;
}

export function LandingPage({onStart, onPricing, onSignIn, onSignUp}: LandingPageProps) {
  return <main className="liquid-app min-h-screen">
    <header className="no-print sticky top-0 z-40 p-3">
      <div className="glass-toolbar mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 py-2.5 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 shrink-0 items-center rounded-xl border border-white/80 bg-white/80 px-2.5 shadow-sm">
            <img src="/CVcopilot.svg" alt="CV Copilot" className="h-5 w-auto" />
          </div>
          <p className="hidden font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600 sm:block">Truthful · Grounded · User approved</p>
        </div>
        <nav className="flex items-center gap-2" aria-label="Primary">
          <a href="#features" className="focus-ring hidden px-3 py-2 text-xs text-neutral-400 hover:text-white sm:inline-block">Features</a>
          <a href="#how" className="focus-ring hidden px-3 py-2 text-xs text-neutral-400 hover:text-white sm:inline-block">How it works</a>
          <button type="button" className="focus-ring hidden px-3 py-2 text-xs text-neutral-400 hover:text-white md:inline-block" onClick={onPricing}>Pricing</button>
          <button type="button" className="focus-ring min-h-10 whitespace-nowrap px-3 py-2 text-xs text-neutral-300 hover:text-white" onClick={onSignIn}>Sign in</button>
          <button type="button" className="focus-ring flex min-h-10 items-center gap-1.5 whitespace-nowrap bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200" onClick={onSignUp}>Create account<ArrowRight size={14} /></button>
        </nav>
      </div>
    </header>

    <section aria-labelledby="hero-title">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(420px,.9fr)]">
        <div className="max-w-3xl">
          <Eyebrow>{LOCAL_AI_ENABLED ? 'Private on-device AI · No account required' : 'Grounded CV tailoring · No account required'}</Eyebrow>
          <h1 id="hero-title" className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Tailor your CV to any job — <span className="text-neutral-500">without inventing a word.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            CV Copilot compares your real experience against a job posting and proposes edits grounded in what you actually did. Your contact details are removed before analysis, and you approve every change.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button className="focus-ring flex items-center justify-center gap-2 bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-neutral-200" onClick={onStart}>
              <Sparkles size={16} />Start building — it&apos;s free
            </button>
            <a href="#how" className="focus-ring flex items-center justify-center gap-2 border border-white/15 px-6 py-3.5 text-sm text-neutral-300 hover:border-white/30 hover:text-white">
              See how it works
            </a>
          </div>
          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2">
            {['Works without signing in', 'Nothing invented', LOCAL_AI_ENABLED ? 'Runs on-device in Private Mode' : 'Contact details removed before analysis'].map(point =>
              <li key={point} className="flex items-center gap-2 text-xs text-neutral-500"><Check size={14} className="text-neutral-300" />{point}</li>)}
          </ul>
        </div>
        <ProductPreview />
      </div>
    </section>

    <section id="features" className="border-t border-white/60" aria-labelledby="features-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Eyebrow>What it does</Eyebrow>
        <h2 id="features-title" className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">A serious editing instrument, not a résumé gimmick</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({icon: Icon, title, body}) =>
            <article key={title} className="glass-card p-6 md:p-7">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/80 bg-white/70 text-neutral-700 shadow-sm"><Icon size={18} strokeWidth={1.5} /></div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            </article>)}
        </div>
      </div>
    </section>

    <section id="how" className="border-t border-white/60 bg-white/20" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Eyebrow>How it works</Eyebrow>
        <h2 id="how-title" className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">Four steps from draft to sent</h2>
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({label, title, body}, index) =>
            <li key={label} className="glass-card p-6 md:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/80 bg-white/70 font-mono text-xs text-neutral-500 shadow-sm">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-mono text-[9px] uppercase tracking-[.18em] text-neutral-600">{label}</span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            </li>)}
        </ol>
      </div>
    </section>

    <section className="border-t border-white/60" aria-labelledby="privacy-title">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
        <div>
          <Eyebrow>Privacy model</Eyebrow>
          <h2 id="privacy-title" className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">Your CV stays yours</h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-neutral-400">
            {LOCAL_AI_ENABLED
              ? 'The app works entirely without an account. Choose the fast cloud path and your name and contact details are removed before anything is sent — or choose Private Mode and run the model on your own device, where nothing is transmitted at all. Cloud saving is always a separate, explicit choice.'
              : 'The app works entirely without an account. Your name and contact details are removed before employment content and job text are sent for analysis. Cloud saving is always a separate, explicit choice.'}
          </p>
        </div>
        <ul className="glass-card grid gap-px self-start overflow-hidden">
          {[
            {icon: Lock, text: 'Name, email, phone, location, and links are stripped before cloud analysis.'},
            ...(LOCAL_AI_ENABLED ? [{icon: Cpu, text: 'Private Mode runs on-device with WebGPU — zero network calls for inference.'}] : []),
            {icon: ShieldCheck, text: 'Company research receives only public role and company details, never your CV.'},
          ].map(({icon: Icon, text}) =>
            <li key={text} className="flex items-start gap-3 border-b border-white/60 bg-white/35 p-5 last:border-b-0">
              <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-neutral-300" />
              <span className="text-sm leading-6 text-neutral-400">{text}</span>
            </li>)}
        </ul>
      </div>
    </section>

    <section className="border-t border-white/60 bg-white/20" aria-labelledby="faq-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Eyebrow>Questions</Eyebrow>
        <h2 id="faq-title" className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">Good to know</h2>
        <div className="glass-card mt-10 divide-y divide-white/10 px-5">
          {FAQ.map(({q, a}) =>
            <details key={q} className="group px-1 py-5">
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-neutral-200 hover:text-white">
                {q}
                <span className="font-mono text-lg leading-none text-neutral-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">{a}</p>
            </details>)}
        </div>
      </div>
    </section>

    <section className="border-t border-white/60" aria-labelledby="cta-title">
      <div className="glass-card mx-auto my-16 max-w-5xl px-6 py-16 text-center md:px-10">
        <h2 id="cta-title" className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">Open the editor and start with your real experience</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-neutral-400">No sign-up, no setup. Your draft autosaves to this browser.</p>
        <button className="focus-ring mx-auto mt-8 flex items-center justify-center gap-2 bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-neutral-200" onClick={onStart}>
          <Sparkles size={16} />Start building
        </button>
      </div>
    </section>

    <footer className="border-t border-white/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
        <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Grounded CV tailoring · No account required</p>
      </div>
    </footer>
  </main>;
}

function ProductPreview() {
  return <div className="glass-panel product-window p-3 shadow-2xl" aria-label="CV Copilot workspace preview">
    <div className="flex items-center justify-between rounded-xl border border-white/70 bg-white/55 px-3 py-2">
      <div className="flex gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-slate-300" /><span className="h-2 w-2 rounded-full bg-slate-300" /><span className="h-2 w-2 rounded-full bg-slate-400" /></div>
      <span className="font-mono text-[8px] uppercase tracking-[.16em] text-neutral-500">Saved locally</span>
    </div>
    <div className="mt-3 grid grid-cols-[1.12fr_.88fr] gap-3">
      <div className="rounded-2xl bg-slate-200/65 p-4">
        <div className="product-window__paper mx-auto w-[78%] p-4">
          <div className="product-window__line w-2/3 bg-slate-500" />
          <div className="product-window__line mt-2 w-1/2" />
          <div className="mt-6 space-y-2">
            <div className="product-window__line w-1/3 bg-slate-400" />
            <div className="product-window__line w-full" />
            <div className="product-window__line w-11/12" />
            <div className="product-window__line w-4/5" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="product-window__line w-2/5 bg-slate-400" />
            <div className="product-window__line w-full" />
            <div className="product-window__line w-5/6" />
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/75 bg-white/55 p-3">
        <div className="segmented-control grid grid-cols-2 p-1 text-center text-[8px]"><span className="rounded-lg bg-white px-2 py-1.5 shadow-sm">Edit CV</span><span className="px-2 py-1.5 text-neutral-500">Tailor</span></div>
        <div className="mt-3 rounded-xl border border-white/80 bg-white/60 p-3">
          <div className="product-window__line w-1/3 bg-slate-400" />
          <div className="mt-3 space-y-2"><div className="product-window__line w-full" /><div className="product-window__line w-4/5" /></div>
        </div>
        <div className="mt-3 rounded-xl border border-white/80 bg-white/55 p-3">
          <div className="product-window__line w-1/2 bg-slate-400" />
          <div className="mt-3 space-y-2"><div className="h-7 rounded-lg bg-white/80 shadow-sm" /><div className="h-7 rounded-lg bg-white/80 shadow-sm" /><div className="h-12 rounded-lg bg-white/80 shadow-sm" /></div>
        </div>
      </div>
    </div>
  </div>;
}
