import {memo} from 'react';
import type {CvDocument} from '../cv/schema';
import type {CvFieldTarget} from '../editor/fieldTargets';
import {Editable} from './Editable';

type TemplateProps = {document: CvDocument; onEditField?: (target: CvFieldTarget) => void};

function dates(start?: string, end?: string, current?: boolean): string {
  return [start, current ? 'Present' : end].filter(Boolean).join(' — ');
}

export const ClassicTemplate = memo(function ClassicTemplate({document, onEditField}: TemplateProps) {
  const compact = document.settings.density === 'compact';
  const experience = document.experience.filter(item => item.company || item.role || item.startDate || item.highlights.some(highlight => highlight.text));
  const education = document.education.filter(item => item.institution || item.qualification || item.field);
  const projects = document.projects.filter(item => item.name || item.description || item.technologies.length || item.highlights.some(highlight => highlight.text));
  const skills = document.skills.filter(item => item.name || item.keywords.length);
  const languages = document.languages.filter(item => item.language || item.proficiency);
  return (
    <article className={`paper font-[Arial,sans-serif] ${compact ? 'p-[12mm] text-[9.5pt] leading-[1.35]' : 'p-[15mm] text-[10.5pt] leading-[1.45]'}`} data-page-size={document.settings.pageSize} aria-label="Classic CV preview">
      <header className={`border-b-2 border-neutral-900 text-center ${compact ? 'pb-3' : 'pb-5'}`}>
        <h1 className="text-[26pt] font-bold tracking-[.05em] text-neutral-950">{document.basics.fullName}</h1>
        {document.basics.headline && <p className="mt-1 text-[12pt] text-neutral-600">{document.basics.headline}</p>}
        <p className="mt-3 text-[9pt] text-neutral-600">
          {[document.basics.email, document.basics.phone, document.basics.location, document.basics.website].filter(Boolean).join('  •  ')}
        </p>
      </header>
      <div className={compact ? 'space-y-3 pt-3' : 'space-y-5 pt-5'}>
        {document.summary && <Section title="Profile"><p><Editable target={{kind: 'summary'}} onEdit={onEditField}>{document.summary}</Editable></p></Section>}
        {experience.length > 0 && <Section title="Experience">
          <div className="space-y-4">{experience.map(item => <div key={item.id} className="break-inside-avoid">
            <div className="flex items-baseline justify-between gap-4"><h3 className="font-bold">{item.role} · {item.company}</h3><span className="shrink-0 text-[9pt] text-neutral-500">{dates(item.startDate, item.endDate, item.current)}</span></div>
            {item.location && <p className="text-[9pt] text-neutral-500">{item.location}</p>}
            {item.highlights.some(highlight => highlight.text) && <ul className="mt-1 list-disc space-y-1 pl-4">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'experience-highlight', itemId: item.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
          </div>)}</div>
        </Section>}
        {projects.length > 0 && <Section title="Projects">
          <div className="space-y-3">{projects.map(project => <div key={project.id} className="break-inside-avoid">
            <h3 className="font-bold">{project.name} <span className="font-normal text-neutral-500">{project.technologies.join(' · ')}</span></h3>
            {project.description && <p><Editable target={{kind: 'project-description', itemId: project.id}} onEdit={onEditField}>{project.description}</Editable></p>}
            {project.highlights.some(highlight => highlight.text) && <ul className="list-disc pl-4">{project.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'project-highlight', itemId: project.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
          </div>)}</div>
        </Section>}
        <div className="grid grid-cols-2 gap-8">
          {education.length > 0 && <Section title="Education">{education.map(item => <div key={item.id} className="mb-3 break-inside-avoid"><h3 className="font-bold">{item.qualification}{item.field ? `, ${item.field}` : ''}</h3><p>{item.institution}</p><p className="text-[9pt] text-neutral-500">{dates(item.startDate, item.endDate)}</p></div>)}</Section>}
          {skills.length > 0 && <Section title="Skills">{skills.map(skill => <p key={skill.id} className="mb-1"><strong>{skill.name}:</strong> {skill.keywords.join(', ')}</p>)}</Section>}
        </div>
        {languages.length > 0 && <Section title="Languages"><p>{languages.map(item => `${item.language}${item.proficiency ? ` (${item.proficiency})` : ''}`).join(' · ')}</p></Section>}
      </div>
    </article>
  );
});

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return <section className="break-inside-auto"><h2 className="mb-2 border-b border-neutral-300 pb-1 text-[10pt] font-bold uppercase tracking-[.14em] text-neutral-900">{title}</h2>{children}</section>;
}
