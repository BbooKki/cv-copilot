import type {CvDocument} from '../cv/schema';
import type {CvFieldTarget} from '../editor/fieldTargets';
import {ClassicTemplate} from './ClassicTemplate';
import {ModernTemplate} from './ModernTemplate';

export function CvPreview({document, onEditField}: {document: CvDocument; onEditField?: (target: CvFieldTarget) => void}) {
  return document.settings.templateId === 'classic'
    ? <ClassicTemplate document={document} onEditField={onEditField} />
    : <ModernTemplate document={document} onEditField={onEditField} />;
}
