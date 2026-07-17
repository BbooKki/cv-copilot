import {memo} from 'react';
import type {CvDocument} from '../cv/schema';

type TemplateProps = {document: CvDocument};

export const ModernTemplate = memo(function ModernTemplate({document}: TemplateProps) {
  const accent = document.settings.accentColor;
  const compact = document.settings.density === 'compact';
  const experience = document.experience.filter(item => item.company || item.role || item.startDate || item.highlights.some(highlight => highlight.text));
  const education = document.education.filter(item => item.institution || item.qualification || item.field);
  const projects = document.projects.filter(item => item.name || item.description || item.technologies.length || item.highlights.some(highlight => highlight.text));
  const skills = document.skills.filter(item => item.name || item.keywords.length);
  const languages = document.languages.filter(item => item.language || item.proficiency);
  return (
    <article className={`paper font-[Arial,sans-serif] ${compact ? 'text-[9pt] leading-[1.35]' : 'text-[10pt] leading-[1.5]'}`} data-page-size={document.settings.pageSize} aria-label="Modern CV preview">
      <header className={`text-white ${compact ? 'px-[12mm] py-[9mm]' : 'px-[15mm] py-[13mm]'}`} style={{backgroundColor: accent}}>
        <p className="text-[9pt] uppercase tracking-[.25em] text-white/65">Curriculum Vitae</p>
        <h1 className="mt-2 text-[28pt] font-bold leading-none">{document.basics.fullName}</h1>
        {document.basics.headline && <p className="mt-3 text-[12pt] text-white/75">{document.basics.headline}</p>}
      </header>
      <div className="grid min-h-[240mm] grid-cols-[31%_1fr]">
        <aside className={`bg-neutral-100 ${compact ? 'px-[7mm] py-[8mm]' : 'px-[9mm] py-[11mm]'}`}>
          <ModernSection title="Contact">{[document.basics.email, document.basics.phone, document.basics.location, document.basics.website].filter(Boolean).map(value => <p key={value} className="mb-2 break-words text-[9pt] text-neutral-600">{value}</p>)}</ModernSection>
          {skills.length > 0 && <ModernSection title="Skills">{skills.map(skill => <div key={skill.id} className="mb-3"><p className="font-bold text-neutral-900">{skill.name}</p><p className="text-[9pt] text-neutral-600">{skill.keywords.join(' · ')}</p></div>)}</ModernSection>}
          {education.length > 0 && <ModernSection title="Education">{education.map(item => <div key={item.id} className="mb-4"><p className="font-bold text-neutral-900">{item.qualification}</p>{item.field && <p>{item.field}</p>}<p className="text-[9pt] text-neutral-600">{item.institution}<br />{[item.startDate, item.endDate].filter(Boolean).join(' — ')}</p></div>)}</ModernSection>}
          {languages.length > 0 && <ModernSection title="Languages">{languages.map(item => <p key={item.id} className="mb-2"><strong>{item.language}</strong><br /><span className="text-[9pt] text-neutral-600">{item.proficiency}</span></p>)}</ModernSection>}
        </aside>
        <div className={compact ? 'px-[8mm] py-[8mm]' : 'px-[11mm] py-[11mm]'}>
          {document.summary && <ModernSection title="Profile"><p className="text-neutral-700">{document.summary}</p></ModernSection>}
          {experience.length > 0 && <ModernSection title="Experience">{experience.map(item => <div key={item.id} className="mb-5 break-inside-avoid">
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-[11pt] font-bold text-neutral-950">{item.role}</h3><p className="font-semibold text-neutral-600">{item.company}</p></div><p className="shrink-0 text-right text-[8.5pt] uppercase tracking-wide text-neutral-500">{item.startDate}<br />{item.current ? 'Present' : item.endDate}</p></div>
            {item.highlights.some(highlight => highlight.text) && <ul className="mt-2 list-disc space-y-1 pl-4 text-neutral-700">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}
          </div>)}</ModernSection>}
          {projects.length > 0 && <ModernSection title="Selected Projects">{projects.map(project => <div key={project.id} className="mb-4 break-inside-avoid"><h3 className="font-bold text-neutral-950">{project.name}</h3><p className="text-[8.5pt] uppercase tracking-wide text-neutral-500">{project.technologies.join(' · ')}</p>{project.description && <p className="mt-1 text-neutral-700">{project.description}</p>}</div>)}</ModernSection>}
        </div>
      </div>
    </article>
  );
});

function ModernSection({title, children}: {title: string; children: React.ReactNode}) {
  return <section className="mb-6"><h2 className="mb-3 text-[9pt] font-bold uppercase tracking-[.18em] text-neutral-950">{title}</h2>{children}</section>;
}
