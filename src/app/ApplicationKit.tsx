import {useState} from 'react';
import {Check, Copy, ExternalLink, Globe, LoaderCircle, Mail, Mic, Search} from 'lucide-react';
import {officialCompanyChannels, type GroundedCompanyBrief} from '../ai/research';
import type {InterviewKit} from '../ai/interview';
import type {OutreachKit} from '../ai/outreach';

type Props = {
  companyName: string;
  roleTitle: string;
  companyBrief: GroundedCompanyBrief | null;
  researchBusy: boolean;
  researchError: string;
  interviewKit: InterviewKit | null;
  interviewBusy: boolean;
  interviewError: string;
  outreachKit: OutreachKit | null;
  outreachBusy: boolean;
  outreachError: string;
  onCompanyNameChange: (value: string) => void;
  onRoleTitleChange: (value: string) => void;
  onResearch: () => void;
  onPrepareInterview: () => void;
  onPrepareOutreach: () => void;
};

export function ApplicationKit({companyName, roleTitle, companyBrief, researchBusy, researchError, interviewKit, interviewBusy, interviewError, outreachKit, outreachBusy, outreachError, onCompanyNameChange, onRoleTitleChange, onResearch, onPrepareInterview, onPrepareOutreach}: Props) {
  const targetLabel = [companyName.trim(), roleTitle.trim()].filter(Boolean).join(' · ') || 'Current application';
  const [openSections, setOpenSections] = useState(() => ({company: !companyBrief, target: !companyName.trim(), interview: !interviewKit, outreach: outreachBusy || Boolean(outreachKit)}));
  const setSectionOpen = (section: keyof typeof openSections, open: boolean) => setOpenSections(current => ({...current, [section]: open}));

  return <section className="border border-white/10 bg-white/[.015]" aria-labelledby="application-kit-title">
    <header className="border-b border-white/10 bg-white/[.02] p-4">
      <p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Application workspace</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div><h3 id="application-kit-title" className="font-display text-lg font-semibold">Application kit</h3><p className="mt-1 text-xs text-neutral-500">{targetLabel}</p></div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-600">{completedCount(companyBrief, interviewKit, outreachKit)} of 3 ready</span>
      </div>
    </header>

    <div className="divide-y divide-white/10">
      <details className="group" open={openSections.company} onToggle={event => setSectionOpen('company', event.currentTarget.open)}>
        <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
          <span className="flex items-center gap-3"><FeatureIcon icon={<Globe size={15} />} /><span><span className="block text-sm font-semibold">Company brief</span><span className="mt-0.5 block text-[11px] text-neutral-600">Public research with claim-level citations</span></span></span>
          <StatusLabel ready={Boolean(companyBrief)} busy={researchBusy} />
        </summary>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-xs leading-5 text-neutral-500">Uses only the company, role, and public job text. Your CV and contact details are never sent for research.</p>
          <details className="mt-3 border border-white/10 bg-black" open={openSections.target} onToggle={event => setSectionOpen('target', event.currentTarget.open)}>
            <summary className="focus-ring cursor-pointer px-3 py-2.5 text-xs text-neutral-400 hover:text-white">{companyName.trim() ? 'Edit target details' : 'Add target details'}</summary>
            <div className="grid gap-3 border-t border-white/10 p-3 sm:grid-cols-2">
              <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Company</span><input className="focus-ring w-full border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" value={companyName} onChange={event => onCompanyNameChange(event.target.value)} /></label>
              <label className="block"><span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Role · optional</span><input className="focus-ring w-full border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-white/40" value={roleTitle} onChange={event => onRoleTitleChange(event.target.value)} /></label>
            </div>
          </details>
          <button className="focus-ring mt-3 flex min-h-10 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" disabled={researchBusy || !companyName.trim()} onClick={onResearch}>{researchBusy ? <><LoaderCircle className="animate-spin" size={14} />Researching with Google…</> : <><Search size={14} />{companyBrief ? 'Refresh company research' : 'Research company'}</>}</button>
          {researchError && <p className="mt-3 text-xs leading-5 text-amber-300" role="status">{researchError}</p>}
          {companyBrief && <CompanyBrief brief={companyBrief} />}
        </div>
      </details>

      <details className="group" open={openSections.interview} onToggle={event => setSectionOpen('interview', event.currentTarget.open)}>
        <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
          <span className="flex items-center gap-3"><FeatureIcon icon={<Mic size={15} />} /><span><span className="block text-sm font-semibold">Interview prep</span><span className="mt-0.5 block text-[11px] text-neutral-600">Grounded pitch and role-specific questions</span></span></span>
          <StatusLabel ready={Boolean(interviewKit)} busy={interviewBusy} />
        </summary>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-xs leading-5 text-neutral-500">Likely questions, thoughtful questions to ask, and a deterministic pitch reconstructed from exact CV evidence.</p>
          <button className="focus-ring mt-3 flex min-h-10 w-full items-center justify-center gap-2 bg-white px-3 py-2.5 text-xs font-semibold text-black disabled:opacity-30" disabled={interviewBusy} onClick={onPrepareInterview}>{interviewBusy ? <><LoaderCircle className="animate-spin" size={14} />Preparing…</> : <><Mic size={14} />{interviewKit ? 'Regenerate interview kit' : 'Prepare interview kit'}</>}</button>
          {interviewError && <p className="mt-3 text-xs leading-5 text-amber-300" role="status">{interviewError}</p>}
          {interviewKit && <InterviewResults kit={interviewKit} />}
        </div>
      </details>

      <details className="group" open={openSections.outreach} onToggle={event => setSectionOpen('outreach', event.currentTarget.open)}>
        <summary className="focus-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
          <span className="flex items-center gap-3"><FeatureIcon icon={<Mail size={15} />} /><span><span className="block text-sm font-semibold">Outreach</span><span className="mt-0.5 block text-[11px] text-neutral-600">Quota-free local email templates</span></span></span>
          <StatusLabel ready={Boolean(outreachKit)} busy={outreachBusy} />
        </summary>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-xs leading-5 text-neutral-500">Role-specific recruiter, hiring-manager, and peer drafts use exact CV fields, with placeholders for anything unknown.</p>
          <button className="focus-ring mt-3 flex min-h-10 w-full items-center justify-center gap-2 border border-white/15 px-3 py-2.5 text-xs font-semibold disabled:opacity-30" disabled={outreachBusy} onClick={onPrepareOutreach}>{outreachBusy ? <><LoaderCircle className="animate-spin" size={14} />Preparing…</> : <><Mail size={14} />{outreachKit ? 'Regenerate templates' : 'Prepare outreach templates'}</>}</button>
          {outreachError && <p className="mt-3 text-xs leading-5 text-amber-300" role="status">{outreachError}</p>}
          {outreachKit && <div className="mt-4 space-y-3">{[{label: 'Recruiter or talent partner', email: outreachKit.recruiterIntro}, {label: 'Hiring manager', email: outreachKit.hiringManagerIntro}, {label: 'Future peer', email: outreachKit.peerIntro}, {label: 'Interview follow-up', email: outreachKit.followUp}].map(({label, email}) => <div key={label} className="border border-white/10 bg-black p-3"><div className="flex items-center justify-between gap-2"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">{label}</p><CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} /></div><p className="mt-2 text-xs font-semibold text-neutral-200">{email.subject}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-400">{email.body}</p></div>)}</div>}
        </div>
      </details>
    </div>
  </section>;
}

function CompanyBrief({brief}: {brief: GroundedCompanyBrief}) {
  const hiringChannels = officialCompanyChannels(brief);
  return <div className="mt-4 border border-white/10 bg-black p-3">
    <p className="text-sm leading-6 text-neutral-200">{brief.summary.text} <ClaimCitations ids={brief.summary.citationIds} sources={brief.sources} /></p>
    {brief.priorities.length > 0 && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Current priorities</p><ul className="mt-2 space-y-2">{brief.priorities.map(priority => <li key={priority.text} className="text-xs leading-5 text-neutral-400">• {priority.text} <ClaimCitations ids={priority.citationIds} sources={brief.sources} /></li>)}</ul></div>}
    {brief.roleContext && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">For this role</p><p className="mt-1 text-xs leading-5 text-neutral-400">{brief.roleContext.text} <ClaimCitations ids={brief.roleContext.citationIds} sources={brief.sources} /></p></div>}
    {hiringChannels.length > 0 && <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Official hiring channels</p><ul className="mt-2 space-y-1">{hiringChannels.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 text-xs text-neutral-300 underline underline-offset-2 hover:text-white"><ExternalLink size={11} />{source.title}</a></li>)}</ul></div>}
    <div className="mt-3"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Sources</p><ul className="mt-2 space-y-1">{brief.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 text-xs text-neutral-300 underline underline-offset-2 hover:text-white"><ExternalLink size={11} />{source.title}</a></li>)}</ul></div>
  </div>;
}

function InterviewResults({kit}: {kit: InterviewKit}) {
  return <div className="mt-4 space-y-4">
    <div className="border border-white/10 bg-black p-3"><div className="flex items-center justify-between gap-2"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">30-second pitch</p><CopyButton text={kit.pitch.text} /></div><p className="mt-2 text-sm leading-6 text-neutral-200">{kit.pitch.text}</p></div>
    <div><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Likely questions</p><ul className="mt-2 space-y-3">{kit.questions.map(item => <li key={item.question} className="border border-white/10 bg-black p-3"><p className="text-sm leading-5 text-neutral-200">{item.question}</p><p className="mt-1 text-xs leading-5 text-neutral-500">{item.rationale}</p></li>)}</ul></div>
    <div><div className="flex items-center justify-between gap-2"><p className="font-mono text-[9px] uppercase tracking-widest text-neutral-600">Questions to ask them</p><CopyButton text={kit.questionsToAsk.join('\n')} label="Copy all" /></div><ul className="mt-2 space-y-1">{kit.questionsToAsk.map(question => <li key={question} className="text-xs leading-5 text-neutral-400">• {question}</li>)}</ul></div>
  </div>;
}

function FeatureIcon({icon}: {icon: React.ReactNode}) {
  return <span className="grid h-8 w-8 shrink-0 place-items-center border border-white/15 bg-white text-black">{icon}</span>;
}

function StatusLabel({ready, busy}: {ready: boolean; busy: boolean}) {
  return <span className={`shrink-0 font-mono text-[9px] uppercase tracking-wider ${ready ? 'text-emerald-400' : 'text-neutral-600'}`}>{busy ? 'Working' : ready ? 'Ready ✓' : 'Not started'}</span>;
}

function CopyButton({text, label}: {text: string; label?: string}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };
  return <button className="focus-ring inline-flex items-center gap-1 border border-white/10 px-2 py-1 text-[10px] text-neutral-400 hover:border-white/30 hover:text-white" onClick={copy}>{copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copied' : label ?? 'Copy'}</button>;
}

function ClaimCitations({ids, sources}: {ids: string[]; sources: GroundedCompanyBrief['sources']}) {
  const byId = new Map(sources.map(source => [source.id, source]));
  return <span className="whitespace-nowrap">{ids.map((id, index) => { const source = byId.get(id); return source ? <a key={id} href={source.url} target="_blank" rel="noreferrer" aria-label={`Source: ${source.title}`} className="ml-1 text-[10px] text-neutral-300 underline underline-offset-2 hover:text-white">[{index + 1}]</a> : null; })}</span>;
}

function completedCount(companyBrief: GroundedCompanyBrief | null, interviewKit: InterviewKit | null, outreachKit: OutreachKit | null): number {
  return [companyBrief, interviewKit, outreachKit].filter(Boolean).length;
}
