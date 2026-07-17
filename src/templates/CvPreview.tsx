import type {CvDocument} from '../cv/schema';
import {ClassicTemplate} from './ClassicTemplate';
import {ModernTemplate} from './ModernTemplate';

export function CvPreview({document}: {document: CvDocument}) {
  return document.settings.templateId === 'classic' ? <ClassicTemplate document={document} /> : <ModernTemplate document={document} />;
}
