import {memo} from 'react';
import {Editable} from './Editable';
import {contactValues, dateRange, getTemplateData, type TemplateProps} from './templateData';

const sectionTitleClass = 'mb-3 border-b border-neutral-300 pb-1.5 font-display text-[9pt] font-semibold uppercase tracking-[.16em] text-neutral-950';

export const ClassicTemplate = memo(function ClassicTemplate({document, onEditField}: TemplateProps) {
  const compact = document.settings.density === 'compact';
  const {experience, education, projects, skills, languages, customSections} = getTemplateData(document);
  const contacts = contactValues(document);

  return (
    <article className={`paper border-t-[4px] font-sans text-neutral-800 ${compact ? 'p-[12mm] pt-[10mm] text-[9.25pt] leading-[1.38]' : 'p-[16mm] pt-[13mm] text-[10pt] leading-[1.48]'}`} style={{borderTopColor: document.settings.accentColor}} data-page-size={document.settings.pageSize} aria-label="Classic ATS CV preview">
      <header className={compact ? 'pb-4' : 'pb-6'}>
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="mb-2 font-mono text-[7.5pt] uppercase tracking-[.22em] text-neutral-500">Curriculum vitae</p>
            <h1 className="font-display text-[28pt] font-semibold leading-[.95] tracking-[-.035em] text-neutral-950">{document.basics.fullName}</h1>
            {document.basics.headline && <p className="mt-2.5 text-[11pt] font-medium text-neutral-600">{document.basics.headline}</p>}
          </div>
          {contacts.length > 0 && <div className="max-w-[72mm] text-right text-[8.5pt] leading-[1.55] text-neutral-600">{contacts.map(value => <p key={value} className="break-words">{value}</p>)}</div>}
        </div>
      </header>

      <div className={compact ? 'space-y-3.5' : 'space-y-5'}>
        {document.summary && <section><h2 className={sectionTitleClass}>Profile</h2><p className="max-w-[178mm] text-neutral-700"><Editable target={{kind: 'summary'}} onEdit={onEditField}>{document.summary}</Editable></p></section>}

        {experience.length > 0 && <section><h2 className={sectionTitleClass}>Experience</h2><div className={compact ? 'space-y-3' : 'space-y-4.5'}>{experience.map(item => <article key={item.id} className="break-inside-avoid">
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-6">
            <h3 className="font-display text-[11pt] font-semibold tracking-[-.01em] text-neutral-950">{item.role}{item.company && <span className="font-normal text-neutral-500"> · {item.company}</span>}</h3>
            <p className="font-mono text-[7.75pt] uppercase tracking-[.08em] text-neutral-500">{dateRange(item.startDate, item.endDate, item.current)}</p>
          </div>
          {item.location && <p className="mt-0.5 text-[8.5pt] text-neutral-500">{item.location}</p>}
          {item.highlights.some(highlight => highlight.text) && <ul className="mt-1.5 list-disc space-y-1 pl-4 marker:text-neutral-400">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'experience-highlight', itemId: item.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
        </article>)}</div></section>}

        {projects.length > 0 && <section><h2 className={sectionTitleClass}>Selected projects</h2><div className={compact ? 'space-y-2.5' : 'space-y-3.5'}>{projects.map(project => <article key={project.id} className="break-inside-avoid">
          <div className="flex flex-wrap items-baseline justify-between gap-x-5"><h3 className="font-display text-[10.5pt] font-semibold text-neutral-950">{project.name}</h3>{project.technologies.length > 0 && <p className="font-mono text-[7.5pt] uppercase tracking-[.06em] text-neutral-500">{project.technologies.join(' · ')}</p>}</div>
          {project.description && <p className="mt-1 text-neutral-700"><Editable target={{kind: 'project-description', itemId: project.id}} onEdit={onEditField}>{project.description}</Editable></p>}
          {project.highlights.some(highlight => highlight.text) && <ul className="mt-1 list-disc space-y-1 pl-4 marker:text-neutral-400">{project.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'project-highlight', itemId: project.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
        </article>)}</div></section>}

        {(education.length > 0 || skills.length > 0) && <div className="grid grid-cols-2 gap-9">
          {education.length > 0 && <section><h2 className={sectionTitleClass}>Education</h2><div className="space-y-3">{education.map(item => <article key={item.id} className="break-inside-avoid"><h3 className="font-semibold text-neutral-950">{item.qualification}{item.field ? ` · ${item.field}` : ''}</h3><p className="text-neutral-600">{item.institution}</p><p className="font-mono text-[7.5pt] text-neutral-500">{dateRange(item.startDate, item.endDate)}{item.location ? ` · ${item.location}` : ''}</p>{item.highlights.some(highlight => highlight.text) && <ul className="mt-1 list-disc pl-4">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}</article>)}</div></section>}
          {skills.length > 0 && <section><h2 className={sectionTitleClass}>Expertise</h2><div className="space-y-2">{skills.map(skill => <p key={skill.id}><strong className="font-semibold text-neutral-950">{skill.name}</strong>{skill.keywords.length > 0 ? ` — ${skill.keywords.join(', ')}` : ''}</p>)}</div></section>}
        </div>}

        {languages.length > 0 && <section><h2 className={sectionTitleClass}>Languages</h2><p>{languages.map(item => `${item.language}${item.proficiency ? ` — ${item.proficiency}` : ''}`).join('   ·   ')}</p></section>}
        {customSections.map(section => <section key={section.id}><h2 className={sectionTitleClass}>{section.title}</h2><div className="space-y-2">{section.items.map(item => <article key={item.id} className="break-inside-avoid">{item.heading && <h3 className="font-semibold text-neutral-950">{item.heading}</h3>}<p>{item.text}</p></article>)}</div></section>)}
      </div>
    </article>
  );
});
