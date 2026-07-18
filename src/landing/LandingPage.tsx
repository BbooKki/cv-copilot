import {ArrowRight, Check, Cpu, Download, Globe, Lock, Mic, ScanSearch, ShieldCheck, Sparkles} from 'lucide-react';

type LandingPageProps = {
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

const FEATURES = [
  {
    icon: Cpu,
    title: 'Private on-device mode',
    body: 'Run the whole analysis locally in your browser with WebGPU. In Private Mode nothing leaves your device — no upload, no account, no trace.',
  },
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
    body: 'Two polished, ATS-friendly templates. What you see in the editor is exactly what exports — paper-white, high-contrast, ready to send.',
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
    a: 'In the recommended cloud path, your name, email, phone, location, and links are stripped before employment content and job text are sent. Private Mode sends nothing at all — the model runs on your device.',
  },
  {
    q: 'Will it make things up to improve my CV?',
    a: 'No. Suggestions must be grounded in evidence already present in your CV. Anything that cannot be verified is rejected rather than guessed.',
  },
  {
    q: 'What do I need for Private Mode?',
    a: 'A WebGPU-capable browser such as recent Chrome or Edge. The on-device model downloads once (about 2 GB) only after you explicitly activate it, then stays cached locally.',
  },
] as const;

function Eyebrow({children}: {children: React.ReactNode}) {
  return <p className="font-mono text-[10px] uppercase tracking-[.22em] text-neutral-500">{children}</p>;
}

export function LandingPage({onStart, onSignIn, onSignUp}: LandingPageProps) {
  return <main className="min-h-screen bg-black text-white">
    <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <p className="hidden font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600 sm:block">Private · Truthful · Grounded</p>
        <nav className="flex items-center gap-2" aria-label="Primary">
          <a href="#features" className="focus-ring hidden px-3 py-2 text-xs text-neutral-400 hover:text-white sm:inline-block">Features</a>
          <a href="#how" className="focus-ring hidden px-3 py-2 text-xs text-neutral-400 hover:text-white sm:inline-block">How it works</a>
          <button type="button" className="focus-ring min-h-10 whitespace-nowrap px-3 py-2 text-xs text-neutral-300 hover:text-white" onClick={onSignIn}>Sign in</button>
          <button type="button" className="focus-ring flex min-h-10 items-center gap-1.5 whitespace-nowrap bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200" onClick={onSignUp}>Create account<ArrowRight size={14} /></button>
        </nav>
      </div>
    </header>

    <section className="app-grid border-b border-white/10" aria-labelledby="hero-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="max-w-3xl">
          <Eyebrow>Private on-device AI · No account required</Eyebrow>
          <h1 id="hero-title" className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Tailor your CV to any job — <span className="text-neutral-400">without inventing a word.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-400 md:text-lg">
            CV Copilot compares your real experience against a job posting, proposes edits grounded in what you actually did, and lets you run the whole thing privately on your own device. You approve every change.
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
            {['Works without signing in', 'Nothing invented', 'Runs on-device in Private Mode'].map(point =>
              <li key={point} className="flex items-center gap-2 text-xs text-neutral-500"><Check size={14} className="text-neutral-300" />{point}</li>)}
          </ul>
        </div>
      </div>
    </section>

    <section id="features" className="border-b border-white/10" aria-labelledby="features-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Eyebrow>What it does</Eyebrow>
        <h2 id="features-title" className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">A serious editing instrument, not a résumé gimmick</h2>
        <div className="mt-12 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({icon: Icon, title, body}) =>
            <article key={title} className="bg-black p-6 md:p-7">
              <div className="grid h-10 w-10 place-items-center border border-white/15 bg-white/[.03] text-white"><Icon size={18} strokeWidth={1.5} /></div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            </article>)}
        </div>
      </div>
    </section>

    <section id="how" className="border-b border-white/10" aria-labelledby="how-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Eyebrow>How it works</Eyebrow>
        <h2 id="how-title" className="mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">Four steps from draft to sent</h2>
        <ol className="mt-12 grid gap-px border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({label, title, body}, index) =>
            <li key={label} className="bg-black p-6 md:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center border border-white/15 font-mono text-xs text-neutral-400">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-mono text-[9px] uppercase tracking-[.18em] text-neutral-600">{label}</span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-400">{body}</p>
            </li>)}
        </ol>
      </div>
    </section>

    <section className="border-b border-white/10" aria-labelledby="privacy-title">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[minmax(0,1fr)_360px] md:px-6">
        <div>
          <Eyebrow>Privacy model</Eyebrow>
          <h2 id="privacy-title" className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">Your CV stays yours</h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-neutral-400">
            The app works entirely without an account. Choose the fast cloud path and your name and contact details are removed before anything is sent — or choose Private Mode and run the model on your own device, where nothing is transmitted at all. Cloud saving is always a separate, explicit choice.
          </p>
        </div>
        <ul className="grid gap-px self-start border border-white/10 bg-white/10">
          {[
            {icon: Lock, text: 'Name, email, phone, location, and links are stripped before cloud analysis.'},
            {icon: Cpu, text: 'Private Mode runs on-device with WebGPU — zero network calls for inference.'},
            {icon: ShieldCheck, text: 'Company research receives only public role and company details, never your CV.'},
          ].map(({icon: Icon, text}) =>
            <li key={text} className="flex items-start gap-3 bg-black p-5">
              <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-neutral-300" />
              <span className="text-sm leading-6 text-neutral-400">{text}</span>
            </li>)}
        </ul>
      </div>
    </section>

    <section className="border-b border-white/10" aria-labelledby="faq-title">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
        <Eyebrow>Questions</Eyebrow>
        <h2 id="faq-title" className="mt-4 font-display text-3xl font-semibold tracking-tight md:text-4xl">Good to know</h2>
        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
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

    <section className="border-b border-white/10 bg-white/[.02]" aria-labelledby="cta-title">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6">
        <h2 id="cta-title" className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight md:text-4xl">Open the editor and start with your real experience</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-neutral-400">No sign-up, no setup. Your draft autosaves to this browser.</p>
        <button className="focus-ring mx-auto mt-8 flex items-center justify-center gap-2 bg-white px-7 py-3.5 text-sm font-semibold text-black hover:bg-neutral-200" onClick={onStart}>
          <Sparkles size={16} />Start building
        </button>
      </div>
    </section>

    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 items-center border border-white/20 px-2">
            <img src="/CVcopilot.svg" alt="CV Copilot" className="h-4 w-auto" />
          </div>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Private on-device AI · No account required</p>
      </div>
    </footer>
  </main>;
}
