import {ChevronDown, ChevronUp, Plus, Trash2} from 'lucide-react';
import type {CvDocument, Education, Experience, Project, Skill} from '../cv/schema';
import {makeId, touchDocument} from '../cv/schema';
import {InputField, TextAreaField} from '../components/Field';

type Props = {document: CvDocument; onChange: (document: CvDocument) => void};

export function CvEditor({document, onChange}: Props) {
  const update = (mutate: (draft: CvDocument) => void) => {
    const draft = structuredClone(document);
    mutate(draft);
    onChange(touchDocument(draft));
  };

  return <div className="space-y-5 pb-24">
    <EditorSection title="Document" eyebrow="01 · Identity">
      <div className="grid gap-3 sm:grid-cols-2">
        <InputField label="CV title" value={document.title} onChange={event => update(draft => { draft.title = event.target.value; })} />
        <InputField label="Full name" value={document.basics.fullName} onChange={event => update(draft => { draft.basics.fullName = event.target.value; })} />
        <InputField label="Headline" value={document.basics.headline ?? ''} onChange={event => update(draft => { draft.basics.headline = event.target.value; })} />
        <InputField label="Location" value={document.basics.location ?? ''} onChange={event => update(draft => { draft.basics.location = event.target.value; })} />
        <InputField label="Email" type="email" value={document.basics.email ?? ''} onChange={event => update(draft => { draft.basics.email = event.target.value; })} />
        <InputField label="Phone" value={document.basics.phone ?? ''} onChange={event => update(draft => { draft.basics.phone = event.target.value; })} />
        <InputField label="Website" className="sm:col-span-2" value={document.basics.website ?? ''} onChange={event => update(draft => { draft.basics.website = event.target.value; })} />
      </div>
      <TextAreaField label="Professional summary" rows={5} value={document.summary ?? ''} onChange={event => update(draft => { draft.summary = event.target.value; })} />
    </EditorSection>

    <EditorSection title="Experience" eyebrow="02 · Evidence" action={<button className="focus-ring flex items-center gap-1 text-xs text-neutral-300 hover:text-white" onClick={() => update(draft => { draft.experience.push(newExperience()); })}><Plus size={14} /> Add</button>}>
      {document.experience.map((item, index) => <RepeatCard key={item.id} title={item.role || 'New experience'} index={index} count={document.experience.length} onUp={() => update(draft => move(draft.experience, index, -1))} onDown={() => update(draft => move(draft.experience, index, 1))} onDelete={() => update(draft => { draft.experience.splice(index, 1); })}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField label="Role" value={item.role} onChange={event => update(draft => { draft.experience[index].role = event.target.value; })} />
          <InputField label="Company" value={item.company} onChange={event => update(draft => { draft.experience[index].company = event.target.value; })} />
          <InputField label="Start" value={item.startDate} onChange={event => update(draft => { draft.experience[index].startDate = event.target.value; })} />
          <InputField label="End" disabled={item.current} value={item.endDate ?? ''} onChange={event => update(draft => { draft.experience[index].endDate = event.target.value; })} />
        </div>
        <label className="flex items-center gap-2 text-xs text-neutral-400"><input type="checkbox" checked={item.current} onChange={event => update(draft => { draft.experience[index].current = event.target.checked; })} /> Current role</label>
        {item.highlights.map((highlight, highlightIndex) => <div key={highlight.id} className="flex items-start gap-2"><textarea aria-label={`Highlight ${highlightIndex + 1}`} className="min-h-20 flex-1 border border-white/10 bg-black p-3 text-sm leading-6 text-white outline-none focus:border-white/40" value={highlight.text} onChange={event => update(draft => { draft.experience[index].highlights[highlightIndex].text = event.target.value; })} /><button aria-label="Delete highlight" className="focus-ring p-2 text-neutral-600 hover:text-red-400" onClick={() => update(draft => { draft.experience[index].highlights.splice(highlightIndex, 1); })}><Trash2 size={15} /></button></div>)}
        <button className="focus-ring text-left font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white" onClick={() => update(draft => { draft.experience[index].highlights.push({id: makeId('highlight'), text: ''}); })}>+ Add highlight</button>
      </RepeatCard>)}
    </EditorSection>

    <EditorSection title="Projects" eyebrow="03 · Work" action={<button className="focus-ring flex items-center gap-1 text-xs text-neutral-300 hover:text-white" onClick={() => update(draft => { draft.projects.push(newProject()); })}><Plus size={14} /> Add</button>}>
      {document.projects.map((project, index) => <RepeatCard key={project.id} title={project.name || 'New project'} index={index} count={document.projects.length} onUp={() => update(draft => move(draft.projects, index, -1))} onDown={() => update(draft => move(draft.projects, index, 1))} onDelete={() => update(draft => { draft.projects.splice(index, 1); })}>
        <InputField label="Name" value={project.name} onChange={event => update(draft => { draft.projects[index].name = event.target.value; })} />
        <TextAreaField label="Description" value={project.description ?? ''} onChange={event => update(draft => { draft.projects[index].description = event.target.value; })} />
        <InputField label="Project URL" value={project.url ?? ''} onChange={event => update(draft => { draft.projects[index].url = event.target.value; })} />
        <InputField label="Technologies (comma separated)" value={project.technologies.join(', ')} onChange={event => update(draft => { draft.projects[index].technologies = splitList(event.target.value); })} />
        {project.highlights.map((highlight, highlightIndex) => <div key={highlight.id} className="flex items-start gap-2"><textarea aria-label={`Project highlight ${highlightIndex + 1}`} className="min-h-20 flex-1 border border-white/10 bg-black p-3 text-sm leading-6 text-white outline-none focus:border-white/40" value={highlight.text} onChange={event => update(draft => { draft.projects[index].highlights[highlightIndex].text = event.target.value; })} /><button aria-label="Delete project highlight" className="focus-ring p-2 text-neutral-600 hover:text-red-400" onClick={() => update(draft => { draft.projects[index].highlights.splice(highlightIndex, 1); })}><Trash2 size={15} /></button></div>)}
        <button className="focus-ring text-left font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white" onClick={() => update(draft => { draft.projects[index].highlights.push({id: makeId('highlight'), text: ''}); })}>+ Add highlight</button>
      </RepeatCard>)}
    </EditorSection>

    <EditorSection title="Skills" eyebrow="04 · Keywords" action={<button className="focus-ring flex items-center gap-1 text-xs text-neutral-300 hover:text-white" onClick={() => update(draft => { draft.skills.push(newSkill()); })}><Plus size={14} /> Add</button>}>
      {document.skills.map((skill, index) => <RepeatCard key={skill.id} title={skill.name || 'New skill group'} index={index} count={document.skills.length} onUp={() => update(draft => move(draft.skills, index, -1))} onDown={() => update(draft => move(draft.skills, index, 1))} onDelete={() => update(draft => { draft.skills.splice(index, 1); })}><div className="grid gap-3 sm:grid-cols-[1fr_2fr]"><InputField label="Group" value={skill.name} onChange={event => update(draft => { draft.skills[index].name = event.target.value; })} /><InputField label="Keywords" value={skill.keywords.join(', ')} onChange={event => update(draft => { draft.skills[index].keywords = splitList(event.target.value); })} /></div></RepeatCard>)}
    </EditorSection>

    <EditorSection title="Education & languages" eyebrow="05 · Background" action={<button className="focus-ring flex items-center gap-1 text-xs text-neutral-300 hover:text-white" onClick={() => update(draft => { draft.education.push(newEducation()); })}><Plus size={14} /> Education</button>}>
      {document.education.map((item, index) => <RepeatCard key={item.id} title={item.qualification || 'New education'} index={index} count={document.education.length} onUp={() => update(draft => move(draft.education, index, -1))} onDown={() => update(draft => move(draft.education, index, 1))} onDelete={() => update(draft => { draft.education.splice(index, 1); })}><div className="grid gap-3 sm:grid-cols-2"><InputField label="Qualification" value={item.qualification} onChange={event => update(draft => { draft.education[index].qualification = event.target.value; })} /><InputField label="Institution" value={item.institution} onChange={event => update(draft => { draft.education[index].institution = event.target.value; })} /><InputField label="Field" value={item.field ?? ''} onChange={event => update(draft => { draft.education[index].field = event.target.value; })} /><InputField label="Location" value={item.location ?? ''} onChange={event => update(draft => { draft.education[index].location = event.target.value; })} /><InputField label="Start" value={item.startDate ?? ''} onChange={event => update(draft => { draft.education[index].startDate = event.target.value; })} /><InputField label="End" value={item.endDate ?? ''} onChange={event => update(draft => { draft.education[index].endDate = event.target.value; })} /></div></RepeatCard>)}
      <div className="mt-5 space-y-3">{document.languages.map((item, index) => <div key={item.id} className="grid grid-cols-[1fr_1.5fr_auto] items-end gap-2"><InputField label="Language" value={item.language} onChange={event => update(draft => { draft.languages[index].language = event.target.value; })} /><InputField label="Proficiency" value={item.proficiency ?? ''} onChange={event => update(draft => { draft.languages[index].proficiency = event.target.value; })} /><button aria-label={`Delete ${item.language}`} className="focus-ring mb-1 p-2 text-neutral-600 hover:text-red-400" onClick={() => update(draft => { draft.languages.splice(index, 1); })}><Trash2 size={15} /></button></div>)}</div>
      <button className="focus-ring font-mono text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white" onClick={() => update(draft => { draft.languages.push({id: makeId('language'), language: '', proficiency: ''}); })}>+ Add language</button>
    </EditorSection>
  </div>;
}

function EditorSection({title, eyebrow, action, children}: {title: string; eyebrow: string; action?: React.ReactNode; children: React.ReactNode}) {
  return <section className="border border-white/10 bg-white/[.02] p-4 md:p-5"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.18em] text-neutral-600">{eyebrow}</p><h2 className="mt-1 font-display text-lg font-semibold text-white">{title}</h2></div>{action}</div><div className="space-y-4">{children}</div></section>;
}

function RepeatCard({title, index, count, onUp, onDown, onDelete, children}: {title: string; index: number; count: number; onUp: () => void; onDown: () => void; onDelete: () => void; children: React.ReactNode}) {
  return <article className="space-y-3 border border-white/10 bg-black p-3"><header className="flex items-center justify-between gap-3"><h3 className="truncate text-sm font-semibold text-neutral-200">{title}</h3><div className="flex items-center"><button aria-label="Move up" disabled={index === 0} className="focus-ring p-1.5 text-neutral-500 hover:text-white disabled:opacity-20" onClick={onUp}><ChevronUp size={14} /></button><button aria-label="Move down" disabled={index === count - 1} className="focus-ring p-1.5 text-neutral-500 hover:text-white disabled:opacity-20" onClick={onDown}><ChevronDown size={14} /></button><button aria-label="Delete item" className="focus-ring p-1.5 text-neutral-500 hover:text-red-400" onClick={onDelete}><Trash2 size={14} /></button></div></header>{children}</article>;
}

function move<T>(items: T[], index: number, offset: number): void {
  const next = index + offset;
  if (next < 0 || next >= items.length) return;
  [items[index], items[next]] = [items[next], items[index]];
}

function splitList(value: string): string[] { return value.split(',').map(item => item.trim()).filter(Boolean); }
function newExperience(): Experience { return {id: makeId('experience'), company: '', role: '', startDate: '', current: false, highlights: []}; }
function newProject(): Project { return {id: makeId('project'), name: '', technologies: [], highlights: []}; }
function newSkill(): Skill { return {id: makeId('skill'), name: '', keywords: []}; }
function newEducation(): Education { return {id: makeId('education'), institution: '', qualification: '', highlights: []}; }
