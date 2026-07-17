import type {CvDocument} from '../cv/schema';

export type StylePreset = {
  id: string;
  name: string;
  accentColor: string;
  density: CvDocument['settings']['density'];
};

/** Curated, tested accent + density combinations for one-click styling. */
export const STYLE_PRESETS: StylePreset[] = [
  {id: 'graphite', name: 'Graphite', accentColor: '#262626', density: 'comfortable'},
  {id: 'navy', name: 'Navy', accentColor: '#1e3a5f', density: 'comfortable'},
  {id: 'forest', name: 'Forest', accentColor: '#1f4d3a', density: 'compact'},
  {id: 'burgundy', name: 'Burgundy', accentColor: '#5b1f2e', density: 'comfortable'},
  {id: 'slate', name: 'Slate', accentColor: '#334155', density: 'compact'},
];
