import type {CvDocument} from '../cv/schema';
import type {CvFieldTarget} from '../editor/fieldTargets';
import {ClassicTemplate} from './ClassicTemplate';
import {MinimalTemplate} from './MinimalTemplate';
import {ModernTemplate} from './ModernTemplate';
import {SidebarTemplate} from './SidebarTemplate';

export function CvPreview({document, onEditField}: {document: CvDocument; onEditField?: (target: CvFieldTarget) => void}) {
  switch (document.settings.templateId) {
    case 'classic': return <ClassicTemplate document={document} onEditField={onEditField} />;
    case 'modern': return <ModernTemplate document={document} onEditField={onEditField} />;
    case 'sidebar': return <SidebarTemplate document={document} onEditField={onEditField} />;
    case 'minimal': return <MinimalTemplate document={document} onEditField={onEditField} />;
  }
}
