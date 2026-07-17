import {memo} from 'react';
import {Editable} from './Editable';
import {contactValues, dateRange, getTemplateData, type TemplateProps} from './templateData';

const sectionTitleClass = 'mb-4 flex items-center gap-3 font-sans text-[8pt] font-semibold uppercase tracking-[.2em] text-neutral-900 before:h-px before:w-5 before:bg-current';

export const ModernTemplate = memo(function ModernTemplate({document, onEditField}: TemplateProps) {
  const compact = document.settings.density === 'compact';
  const accent = document.settings.accentColor;
  const {experience, education, projects, skills, languages, customSections} = getTemplateData(document);
  const contacts = contactValues(document);

  return (
    <article className={`paper font-[Georgia,serif] text-neutral-800 ${compact ? 'p-[11mm] text-[9pt] leading-[1.38]' : 'p-[15mm] text-[9.75pt] leading-[1.5]'}`} data-page-size={document.settings.pageSize} aria-label="Modern Editorial CV preview">
      <header className={`grid grid-cols-[1fr_55mm] gap-10 border-b ${compact ? 'pb-5' : 'pb-8'}`} style={{borderBottomColor: accent}}>
        <div>
          <p className="mb-3 font-sans text-[8pt] font-semibold uppercase tracking-[.24em]" style={{color: accent}}>Professional profile</p>
          <h1 className="text-[31pt] font-normal leading-[.94] tracking-[-.045em] text-neutral-950">{document.basics.fullName}</h1>
          {document.basics.headline && <p className="mt-3 text-[12pt] italic text-neutral-600">{document.basics.headline}</p>}
        </div>
        {contacts.length > 0 && <div className="self-end border-l pl-5 font-sans text-[8pt] leading-[1.6] text-neutral-600" style={{borderLeftColor: accent}}>{contacts.map(value => <p key={value} className="break-words">{value}</p>)}</div>}
      </header>

      <div className={`grid grid-cols-[minmax(0,1fr)_52mm] gap-10 ${compact ? 'pt-5' : 'pt-8'}`}>
        <div className={compact ? 'space-y-4' : 'space-y-6'}>
          {document.summary && <section><h2 className={sectionTitleClass}>Profile</h2><p className="text-[10.5pt] leading-[1.55] text-neutral-700"><Editable target={{kind: 'summary'}} onEdit={onEditField}>{document.summary}</Editable></p></section>}
          {experience.length > 0 && <section><h2 className={sectionTitleClass}>Experience</h2><div className={compact ? 'space-y-4' : 'space-y-6'}>{experience.map(item => <article key={item.id} className="break-inside-avoid border-l pl-5" style={{borderLeftColor: accent}}>
            <p className="font-sans text-[7.5pt] font-semibold uppercase tracking-[.12em] text-neutral-500">{dateRange(item.startDate, item.endDate, item.current)}</p>
            <h3 className="mt-1 text-[12pt] leading-tight text-neutral-950">{item.role}</h3>
            <p className="mt-0.5 italic text-neutral-600">{item.company}{item.location ? ` · ${item.location}` : ''}</p>
            {item.highlights.some(highlight => highlight.text) && <ul className="mt-2 space-y-1.5 pl-0">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id} className="relative pl-4 before:absolute before:left-0 before:content-['—']"><Editable target={{kind: 'experience-highlight', itemId: item.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
          </article>)}</div></section>}
          {projects.length > 0 && <section><h2 className={sectionTitleClass}>Selected work</h2><div className="space-y-4">{projects.map(project => <article key={project.id} className="break-inside-avoid"><div className="flex items-baseline justify-between gap-4"><h3 className="text-[11pt] text-neutral-950">{project.name}</h3>{project.url && <span className="max-w-[45%] break-all font-sans text-[7pt] text-neutral-500">{project.url}</span>}</div>{project.technologies.length > 0 && <p className="mt-1 font-sans text-[7.5pt] font-semibold uppercase tracking-[.08em]" style={{color: accent}}>{project.technologies.join(' · ')}</p>}{project.description && <p className="mt-1.5"><Editable target={{kind: 'project-description', itemId: project.id}} onEdit={onEditField}>{project.description}</Editable></p>}{project.highlights.some(highlight => highlight.text) && <ul className="mt-1.5 space-y-1 pl-4">{project.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'project-highlight', itemId: project.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}</article>)}</div></section>}
          {customSections.map(section => <section key={section.id}><h2 className={sectionTitleClass}>{section.title}</h2><div className="space-y-3">{section.items.map(item => <article key={item.id} className="break-inside-avoid">{item.heading && <h3 className="text-[10.5pt] text-neutral-950">{item.heading}</h3>}<p>{item.text}</p></article>)}</div></section>)}
        </div>

        <aside className={compact ? 'space-y-5' : 'space-y-7'}>
          {skills.length > 0 && <section><h2 className={sectionTitleClass}>Expertise</h2><div className="space-y-3">{skills.map(skill => <div key={skill.id}><h3 className="font-sans text-[8.5pt] font-semibold text-neutral-950">{skill.name}</h3>{skill.keywords.length > 0 && <p className="mt-0.5 text-neutral-600">{skill.keywords.join(' · ')}</p>}</div>)}</div></section>}
          {education.length > 0 && <section><h2 className={sectionTitleClass}>Education</h2><div className="space-y-4">{education.map(item => <article key={item.id} className="break-inside-avoid"><h3 className="text-[10pt] text-neutral-950">{item.qualification}</h3>{item.field && <p className="italic text-neutral-600">{item.field}</p>}<p className="mt-1 font-sans text-[8pt] text-neutral-500">{item.institution}<br />{dateRange(item.startDate, item.endDate)}{item.location ? ` · ${item.location}` : ''}</p>{item.highlights.some(highlight => highlight.text) && <ul className="mt-1 list-disc pl-4">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}</article>)}</div></section>}
          {languages.length > 0 && <section><h2 className={sectionTitleClass}>Languages</h2><div className="space-y-2">{languages.map(item => <p key={item.id}><strong className="font-normal text-neutral-950">{item.language}</strong>{item.proficiency && <><br /><span className="font-sans text-[8pt] text-neutral-500">{item.proficiency}</span></>}</p>)}</div></section>}
        </aside>
      </div>
    </article>
  );
});
