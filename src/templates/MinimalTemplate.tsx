import {memo} from 'react';
import {Editable} from './Editable';
import {contactValues, dateRange, getTemplateData, type TemplateProps} from './templateData';

const sectionTitleClass = 'font-mono text-[7.5pt] font-semibold uppercase tracking-[.14em] text-neutral-600';

export const MinimalTemplate = memo(function MinimalTemplate({document, onEditField}: TemplateProps) {
  const compact = document.settings.density === 'compact';
  const {experience, education, projects, skills, languages, customSections} = getTemplateData(document);
  const contacts = contactValues(document);
  let sectionNumber = 0;
  const number = () => String(++sectionNumber).padStart(2, '0');

  return (
    <article className={`paper font-sans text-neutral-800 ${compact ? 'p-[11mm] text-[8.75pt] leading-[1.36]' : 'p-[15mm] text-[9.5pt] leading-[1.45]'}`} data-page-size={document.settings.pageSize} aria-label="Minimal Technical CV preview">
      <header className="border-y border-neutral-950 py-5">
        <div className="grid grid-cols-[1fr_auto] items-start gap-8">
          <div><h1 className="font-display text-[27pt] font-semibold leading-none tracking-[-.04em] text-neutral-950">{document.basics.fullName}</h1>{document.basics.headline && <p className="mt-2 font-mono text-[8pt] uppercase tracking-[.12em]" style={{color: document.settings.accentColor}}>{document.basics.headline}</p>}</div>
          <p className="font-mono text-[7pt] uppercase tracking-[.16em] text-neutral-500">CV / {new Date(document.updatedAt).getUTCFullYear()}</p>
        </div>
        {contacts.length > 0 && <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-neutral-200 pt-3 font-mono text-[7pt] text-neutral-500">{contacts.map(value => <span key={value} className="break-all">{value}</span>)}</div>}
      </header>

      <div className={compact ? 'space-y-4 pt-5' : 'space-y-6 pt-7'}>
        {document.summary && <section className="grid grid-cols-[25mm_1fr] gap-5"><h2 className={sectionTitleClass}>{number()} / Profile</h2><p className="max-w-[145mm] text-[10pt] leading-[1.55] text-neutral-700"><Editable target={{kind: 'summary'}} onEdit={onEditField}>{document.summary}</Editable></p></section>}
        {experience.length > 0 && <section className="grid grid-cols-[25mm_1fr] gap-5"><h2 className={sectionTitleClass}>{number()} / Experience</h2><div className={compact ? 'space-y-3.5' : 'space-y-5'}>{experience.map(item => <article key={item.id} className="break-inside-avoid">
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-5"><h3 className="font-display text-[10.75pt] font-semibold text-neutral-950">{item.role} <span className="font-normal text-neutral-500">@ {item.company}</span></h3><p className="font-mono text-[7pt] text-neutral-500">{dateRange(item.startDate, item.endDate, item.current)}</p></div>
          {item.location && <p className="mt-0.5 font-mono text-[7pt] text-neutral-500">{item.location}</p>}
          {item.highlights.some(highlight => highlight.text) && <ul className="mt-2 space-y-1.5">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id} className="grid grid-cols-[8px_1fr] gap-2 before:content-['+']"><Editable target={{kind: 'experience-highlight', itemId: item.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
        </article>)}</div></section>}
        {projects.length > 0 && <section className="grid grid-cols-[25mm_1fr] gap-5"><h2 className={sectionTitleClass}>{number()} / Projects</h2><div className="grid grid-cols-2 gap-x-7 gap-y-4">{projects.map(project => <article key={project.id} className="break-inside-avoid border-t border-neutral-300 pt-2"><h3 className="font-display text-[10pt] font-semibold text-neutral-950">{project.name}</h3>{project.technologies.length > 0 && <p className="mt-1 font-mono text-[6.75pt] uppercase tracking-[.06em]" style={{color: document.settings.accentColor}}>{project.technologies.join(' / ')}</p>}{project.description && <p className="mt-1.5"><Editable target={{kind: 'project-description', itemId: project.id}} onEdit={onEditField}>{project.description}</Editable></p>}{project.highlights.some(highlight => highlight.text) && <ul className="mt-1 space-y-1">{project.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id} className="pl-3 before:-ml-3 before:mr-1 before:content-['+']"><Editable target={{kind: 'project-highlight', itemId: project.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}</article>)}</div></section>}
        {(education.length > 0 || skills.length > 0 || languages.length > 0) && <section className="grid grid-cols-[25mm_1fr] gap-5"><h2 className={sectionTitleClass}>{number()} / Details</h2><div className="grid grid-cols-2 gap-7">
          {education.length > 0 && <div><h3 className="mb-2 font-mono text-[7pt] font-semibold uppercase tracking-[.12em] text-neutral-950">Education</h3><div className="space-y-3">{education.map(item => <article key={item.id} className="break-inside-avoid"><p className="font-semibold text-neutral-950">{item.qualification}{item.field ? ` · ${item.field}` : ''}</p><p className="text-neutral-600">{item.institution}</p><p className="font-mono text-[7pt] text-neutral-500">{dateRange(item.startDate, item.endDate)}{item.location ? ` / ${item.location}` : ''}</p>{item.highlights.some(highlight => highlight.text) && <ul className="mt-1 list-disc pl-4">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}</article>)}</div></div>}
          <div className="space-y-4">{skills.length > 0 && <div><h3 className="mb-2 font-mono text-[7pt] font-semibold uppercase tracking-[.12em] text-neutral-950">Skills</h3><div className="space-y-1.5">{skills.map(skill => <p key={skill.id}><strong>{skill.name}</strong>{skill.keywords.length > 0 ? ` / ${skill.keywords.join(' / ')}` : ''}</p>)}</div></div>}{languages.length > 0 && <div><h3 className="mb-2 font-mono text-[7pt] font-semibold uppercase tracking-[.12em] text-neutral-950">Languages</h3><p>{languages.map(item => `${item.language}${item.proficiency ? ` (${item.proficiency})` : ''}`).join(' / ')}</p></div>}</div>
        </div></section>}
        {customSections.map(section => <section key={section.id} className="grid grid-cols-[25mm_1fr] gap-5"><h2 className={sectionTitleClass}>{number()} / {section.title}</h2><div className="grid grid-cols-2 gap-5">{section.items.map(item => <article key={item.id} className="break-inside-avoid border-t border-neutral-300 pt-2">{item.heading && <h3 className="font-semibold text-neutral-950">{item.heading}</h3>}<p>{item.text}</p></article>)}</div></section>)}
      </div>
    </article>
  );
});
