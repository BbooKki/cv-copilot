import {Building2, Mail, Search, UserRoundSearch, UsersRound} from 'lucide-react';

type Props = {
  companyName: string;
  researchBusy: boolean;
  outreachBusy: boolean;
  onResearchOfficialChannels: () => void;
  onPrepareOutreach: () => void;
};

const CONTACT_ROLES = [
  {title: 'Recruiter or talent partner', purpose: 'Hiring process and timeline', question: 'What is the team prioritizing for this hire?', icon: <UserRoundSearch size={13} />},
  {title: 'Hiring manager', purpose: 'Role scope and expectations', question: 'What would success look like in the first 90 days?', icon: <Building2 size={13} />},
  {title: 'Future peer', purpose: 'Day-to-day work and collaboration', question: 'How does the team collaborate and maintain quality?', icon: <UsersRound size={13} />},
] as const;

export function ContactStrategyCard({companyName, researchBusy, outreachBusy, onResearchOfficialChannels, onPrepareOutreach}: Props) {
  return <article className="ml-9 max-w-[88%] overflow-hidden rounded-[4px_14px_14px_14px] border border-white/15 bg-white/[.05]" aria-labelledby="contact-strategy-title">
    <header className="border-b border-white/10 px-3.5 py-3">
      <p className="font-mono text-[8px] uppercase tracking-[.14em] text-neutral-600">Connection strategy · official channels only</p>
      <h3 id="contact-strategy-title" className="mt-1 text-sm font-semibold text-neutral-100">Who should I contact?</h3>
      <p className="mt-1 text-xs leading-5 text-neutral-500">Choose the role that matches your question. CV Copilot finds official company channels, not named employees, personal profiles, or inferred emails.</p>
    </header>
    <ul className="divide-y divide-white/10">
      {CONTACT_ROLES.map(role => <li key={role.title} className="px-3.5 py-3">
        <div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center border border-white/15 text-neutral-300">{role.icon}</span><div><p className="text-xs font-semibold text-neutral-200">{role.title}</p><p className="mt-0.5 text-[11px] text-neutral-500">{role.purpose}</p><p className="mt-1 text-[11px] leading-4 text-neutral-400">Ask: “{role.question}”</p></div></div>
      </li>)}
    </ul>
    <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
      <button className="focus-ring flex min-h-10 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-[10px] font-semibold text-neutral-200 hover:border-white/30 hover:text-white disabled:opacity-30" disabled={researchBusy || !companyName.trim()} onClick={onResearchOfficialChannels}><Search size={13} />{researchBusy ? 'Researching…' : companyName.trim() ? 'Find official channels' : 'Add company details'}</button>
      <button className="focus-ring flex min-h-10 items-center justify-center gap-2 bg-white px-3 py-2 text-[10px] font-semibold text-black disabled:opacity-30" disabled={outreachBusy} onClick={onPrepareOutreach}><Mail size={13} />{outreachBusy ? 'Preparing…' : 'Prepare outreach drafts'}</button>
    </div>
  </article>;
}
