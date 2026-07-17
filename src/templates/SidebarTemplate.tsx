import {memo} from 'react';
import {Editable} from './Editable';
import {contactValues, dateRange, getTemplateData, type TemplateProps} from './templateData';

const mainTitleClass = 'mb-3 font-display text-[9pt] font-semibold uppercase tracking-[.16em] text-neutral-950';
const sideTitleClass = 'mb-3 border-b border-white/25 pb-2 font-mono text-[7.5pt] font-semibold uppercase tracking-[.18em] text-white';

export const SidebarTemplate = memo(function SidebarTemplate({document, onEditField}: TemplateProps) {
  const compact = document.settings.density === 'compact';
  const {experience, education, projects, skills, languages, customSections} = getTemplateData(document);
  const contacts = contactValues(document);

  return (
    <article className={`paper grid grid-cols-[61mm_1fr] font-sans text-neutral-800 ${compact ? 'text-[8.75pt] leading-[1.38]' : 'text-[9.5pt] leading-[1.48]'}`} data-page-size={document.settings.pageSize} aria-label="Professional Sidebar CV preview">
      <aside className={`text-white ${compact ? 'px-[9mm] py-[11mm]' : 'px-[10mm] py-[15mm]'}`} style={{backgroundColor: document.settings.accentColor}}>
        <div className="mb-8 h-8 w-8 border border-white/50 before:mx-auto before:block before:h-full before:w-px before:bg-white/50" aria-hidden="true" />
        {contacts.length > 0 && <section className={compact ? 'mb-5' : 'mb-7'}><h2 className={sideTitleClass}>Contact</h2><div className="space-y-2 text-[8pt] leading-[1.45] text-white/80">{contacts.map(value => <p key={value} className="break-words">{value}</p>)}</div></section>}
        {skills.length > 0 && <section className={compact ? 'mb-5' : 'mb-7'}><h2 className={sideTitleClass}>Capabilities</h2><div className="space-y-3">{skills.map(skill => <div key={skill.id}><h3 className="text-[8.5pt] font-semibold text-white">{skill.name}</h3>{skill.keywords.length > 0 && <p className="mt-1 text-[8pt] leading-[1.45] text-white/70">{skill.keywords.join(' / ')}</p>}</div>)}</div></section>}
        {education.length > 0 && <section className={compact ? 'mb-5' : 'mb-7'}><h2 className={sideTitleClass}>Education</h2><div className="space-y-4">{education.map(item => <article key={item.id} className="break-inside-avoid"><h3 className="font-semibold text-white">{item.qualification}</h3>{item.field && <p className="text-white/80">{item.field}</p>}<p className="mt-1 text-[8pt] text-white/65">{item.institution}<br />{dateRange(item.startDate, item.endDate)}{item.location ? <><br />{item.location}</> : null}</p>{item.highlights.some(highlight => highlight.text) && <ul className="mt-1 list-disc pl-4 text-[8pt] text-white/75">{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}>{highlight.text}</li>)}</ul>}</article>)}</div></section>}
        {languages.length > 0 && <section><h2 className={sideTitleClass}>Languages</h2><div className="space-y-2">{languages.map(item => <p key={item.id}><strong className="font-semibold text-white">{item.language}</strong>{item.proficiency && <><br /><span className="text-[8pt] text-white/65">{item.proficiency}</span></>}</p>)}</div></section>}
      </aside>

      <div className={compact ? 'px-[10mm] py-[11mm]' : 'px-[13mm] py-[15mm]'}>
        <header className={`border-b border-neutral-300 ${compact ? 'pb-5' : 'pb-7'}`}>
          <p className="font-mono text-[7.5pt] uppercase tracking-[.2em] text-neutral-500">Curriculum vitae</p>
          <h1 className="mt-3 font-display text-[29pt] font-semibold leading-[.95] tracking-[-.04em] text-neutral-950">{document.basics.fullName}</h1>
          {document.basics.headline && <p className="mt-3 text-[11pt] font-medium" style={{color: document.settings.accentColor}}>{document.basics.headline}</p>}
        </header>

        <div className={compact ? 'space-y-4 pt-5' : 'space-y-6 pt-7'}>
          {document.summary && <section><h2 className={mainTitleClass}>Profile</h2><p className="text-neutral-600"><Editable target={{kind: 'summary'}} onEdit={onEditField}>{document.summary}</Editable></p></section>}
          {experience.length > 0 && <section><h2 className={mainTitleClass}>Experience</h2><div className={compact ? 'space-y-3.5' : 'space-y-5'}>{experience.map(item => <article key={item.id} className="break-inside-avoid">
            <div className="grid grid-cols-[1fr_auto] gap-4"><div><h3 className="font-display text-[11pt] font-semibold text-neutral-950">{item.role}</h3><p className="font-medium text-neutral-600">{item.company}{item.location ? ` · ${item.location}` : ''}</p></div><p className="font-mono text-right text-[7.25pt] uppercase tracking-[.06em] text-neutral-500">{dateRange(item.startDate, item.endDate, item.current)}</p></div>
            {item.highlights.some(highlight => highlight.text) && <ul className="mt-2 space-y-1.5 border-l-2 pl-4 text-neutral-700" style={{borderLeftColor: document.settings.accentColor}}>{item.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'experience-highlight', itemId: item.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}
          </article>)}</div></section>}
          {projects.length > 0 && <section><h2 className={mainTitleClass}>Projects</h2><div className="space-y-4">{projects.map(project => <article key={project.id} className="break-inside-avoid"><h3 className="font-display text-[10.5pt] font-semibold text-neutral-950">{project.name}</h3>{project.technologies.length > 0 && <p className="mt-1 font-mono text-[7.25pt] uppercase tracking-[.08em] text-neutral-500">{project.technologies.join(' · ')}</p>}{project.description && <p className="mt-1.5 text-neutral-700"><Editable target={{kind: 'project-description', itemId: project.id}} onEdit={onEditField}>{project.description}</Editable></p>}{project.highlights.some(highlight => highlight.text) && <ul className="mt-1.5 list-disc space-y-1 pl-4">{project.highlights.filter(highlight => highlight.text).map(highlight => <li key={highlight.id}><Editable target={{kind: 'project-highlight', itemId: project.id, highlightId: highlight.id}} onEdit={onEditField}>{highlight.text}</Editable></li>)}</ul>}</article>)}</div></section>}
          {customSections.map(section => <section key={section.id}><h2 className={mainTitleClass}>{section.title}</h2><div className="space-y-3">{section.items.map(item => <article key={item.id} className="break-inside-avoid">{item.heading && <h3 className="font-semibold text-neutral-950">{item.heading}</h3>}<p>{item.text}</p></article>)}</div></section>)}
        </div>
      </div>
    </article>
  );
});
