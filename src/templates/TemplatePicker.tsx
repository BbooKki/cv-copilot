import {Check} from 'lucide-react';
import type {CvDocument} from '../cv/schema';
import {TEMPLATE_OPTIONS} from './templateCatalog';

type Settings = CvDocument['settings'];
type Props = {
  settings: Settings;
  onTemplateChange: (templateId: Settings['templateId']) => void;
  onDensityChange: (density: Settings['density']) => void;
  onPageSizeChange: (pageSize: Settings['pageSize']) => void;
  onAccentChange: (accentColor: string) => void;
};

export function TemplatePicker({settings, onTemplateChange, onDensityChange, onPageSizeChange, onAccentChange}: Props) {
  return <section className="border border-white/10 bg-white/[.02] p-4" aria-labelledby="template-picker-title">
    <div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-neutral-600">Presentation</p><h3 id="template-picker-title" className="mt-1 font-display text-lg font-semibold">Choose a template</h3></div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      {TEMPLATE_OPTIONS.map(template => {
        const selected = settings.templateId === template.id;
        return <button key={template.id} type="button" aria-pressed={selected} className={`focus-ring relative border p-3 text-left transition ${selected ? 'border-white bg-white text-black' : 'border-white/10 bg-black text-neutral-300 hover:border-white/30'}`} onClick={() => onTemplateChange(template.id)}>
          {selected && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-md bg-slate-900 text-white" aria-hidden="true"><Check size={12} /></span>}
          <TemplateMiniature templateId={template.id} selected={selected} />
          <span className="mt-3 block text-xs font-semibold">{template.name}</span>
          <span className={`mt-1 block text-[10px] leading-4 ${selected ? 'text-neutral-600' : 'text-neutral-500'}`}>{template.description}</span>
        </button>;
      })}
    </div>
    <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
      <label className="block"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Density</span><select className="focus-ring h-10 w-full border border-white/10 bg-black px-2 text-xs text-neutral-300" value={settings.density} onChange={event => onDensityChange(event.target.value as Settings['density'])}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
      <label className="block"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Page</span><select className="focus-ring h-10 w-full border border-white/10 bg-black px-2 text-xs text-neutral-300" value={settings.pageSize} onChange={event => onPageSizeChange(event.target.value as Settings['pageSize'])}><option value="A4">A4</option><option value="letter">Letter</option></select></label>
      <label className="block"><span className="mb-1.5 block font-mono text-[9px] uppercase tracking-widest text-neutral-600">Accent</span><input aria-label="Accent color" type="color" className="focus-ring h-10 w-full border border-white/10 bg-black p-1" value={settings.accentColor} onChange={event => onAccentChange(event.target.value)} /></label>
    </div>
  </section>;
}

function TemplateMiniature({templateId, selected}: {templateId: Settings['templateId']; selected: boolean}) {
  const ink = selected ? 'bg-slate-900' : 'bg-neutral-500';
  const quiet = selected ? 'bg-neutral-400' : 'bg-neutral-800';
  return <span className={`block h-24 border p-2 ${selected ? 'border-black/20 bg-neutral-100' : 'border-white/10 bg-neutral-950'}`} aria-hidden="true">
    {templateId === 'classic' && <span className="block h-full border-t-2 border-current pt-2"><span className={`mb-1 block h-2 w-1/2 ${ink}`} /><span className={`mb-3 block h-1 w-1/3 ${quiet}`} /><span className={`mb-1 block h-px w-full ${quiet}`} /><span className={`mb-1 block h-1 w-full ${quiet}`} /><span className={`mb-3 block h-1 w-5/6 ${quiet}`} /><span className={`mb-1 block h-px w-full ${quiet}`} /><span className={`block h-1 w-3/4 ${quiet}`} /></span>}
    {templateId === 'modern' && <span className="block h-full"><span className="grid grid-cols-[1fr_30%] gap-2 border-b border-current pb-2"><span className={`block h-4 ${ink}`} /><span className={`block h-4 ${quiet}`} /></span><span className="mt-2 grid grid-cols-[1fr_32%] gap-2"><span><span className={`mb-1 block h-1 w-full ${quiet}`} /><span className={`mb-1 block h-1 w-5/6 ${quiet}`} /><span className={`mt-2 block h-1 w-full ${quiet}`} /></span><span className={`block h-10 ${quiet}`} /></span></span>}
    {templateId === 'sidebar' && <span className="grid h-full grid-cols-[31%_1fr] gap-2"><span className={`block ${ink}`} /><span className="pt-2"><span className={`mb-1 block h-3 w-4/5 ${ink}`} /><span className={`mb-4 block h-1 w-1/2 ${quiet}`} /><span className={`mb-1 block h-px w-full ${quiet}`} /><span className={`mb-1 block h-1 w-full ${quiet}`} /><span className={`block h-1 w-3/4 ${quiet}`} /></span></span>}
    {templateId === 'minimal' && <span className="block h-full border-y border-current py-2"><span className={`mb-3 block h-3 w-1/2 ${ink}`} /><span className="grid grid-cols-[22%_1fr] gap-2"><span className={`block h-1 ${ink}`} /><span><span className={`mb-1 block h-1 w-full ${quiet}`} /><span className={`mb-3 block h-1 w-5/6 ${quiet}`} /></span><span className={`block h-1 ${ink}`} /><span><span className={`mb-1 block h-1 w-full ${quiet}`} /><span className={`block h-1 w-2/3 ${quiet}`} /></span></span></span>}
  </span>;
}
