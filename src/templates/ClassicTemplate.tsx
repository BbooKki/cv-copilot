import {memo} from 'react';
import type {CvDocument} from '../cv/schema';

type TemplateProps = {document: CvDocument};

function dates(start?: string, end?: string, current?: boolean): string {
  return [start, current ? 'Present' : end].filter(Boolean).join(' — ');
}

export const ClassicTemplate = memo(function ClassicTemplate({document}: TemplateProps) {
  return (
    <article className="paper p-[15mm] font-[Arial,sans-serif] text-[10.5pt] leading-[1.45]" data-page-size={document.settings.pageSize} aria-label="Classic CV preview">
      <header className="border-b-2 border-neutral-900 pb-5 text-center">
        <h1 className="text-[26pt] font-bold tracking-[.05em] text-neutral-950">{document.basics.fullName}</h1>
        {document.basics.headline && <p className="mt-1 text-[12pt] text-neutral-600">{document.basics.headline}</p>}
        <p className="mt-3 text-[9pt] text-neutral-600">
          {[document.basics.email, document.basics.phone, document.basics.location, document.basics.website].filter(Boolean).join('  •  ')}
        </p>
      </header>
      <div className="space-y-5 pt-5">
        {document.summary && <Section title="Profile"><p>{document.summary}</p></Section>}
        {document.experience.length > 0 && <Section title="Experience">
          <div className="space-y-4">{document.experience.map(item => <div key={item.id} className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-4"><h3 className="font-bold">{item.role} · {item.company}</h3><span className="shrink-0 text-[9pt] text-neutral-500">{dates(item.startDate, item.endDate, item.current)}</span></div>
            {item.location && <p className="text-[9pt] text-neutral-500">{item.location}</p>}
            {item.highlights.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-4">{item.highlights.map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}
          </div>)}</div>
        </Section>}
        {document.projects.length > 0 && <Section title="Projects">
          <div className="space-y-3">{document.projects.map(project => <div key={project.id} className="break-inside-avoid">
            <h3 className="font-bold">{project.name} <span className="font-normal text-neutral-500">{project.technologies.join(' · ')}</span></h3>
            {project.description && <p>{project.description}</p>}
            {project.highlights.length > 0 && <ul className="list-disc pl-4">{project.highlights.map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}
          </div>)}</div>
        </Section>}
        <div className="grid grid-cols-2 gap-8">
          {document.education.length > 0 && <Section title="Education">{document.education.map(item => <div key={item.id} className="mb-3 break-inside-avoid"><h3 className="font-bold">{item.qualification}{item.field ? `, ${item.field}` : ''}</h3><p>{item.institution}</p><p className="text-[9pt] text-neutral-500">{dates(item.startDate, item.endDate)}</p></div>)}</Section>}
          {document.skills.length > 0 && <Section title="Skills">{document.skills.map(skill => <p key={skill.id} className="mb-1"><strong>{skill.name}:</strong> {skill.keywords.join(', ')}</p>)}</Section>}
        </div>
        {document.languages.length > 0 && <Section title="Languages"><p>{document.languages.map(item => `${item.language}${item.proficiency ? ` (${item.proficiency})` : ''}`).join(' · ')}</p></Section>}
      </div>
    </article>
  );
});

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return <section className="break-inside-auto"><h2 className="mb-2 border-b border-neutral-300 pb-1 text-[10pt] font-bold uppercase tracking-[.14em] text-neutral-900">{title}</h2>{children}</section>;
}
