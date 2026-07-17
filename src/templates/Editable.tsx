import type {ReactNode} from 'react';
import type {CvFieldTarget} from '../editor/fieldTargets';

/**
 * Wraps a preview text node so it can be clicked to edit. When no handler is
 * provided (e.g. print/export), it renders the text unchanged with no controls.
 */
export function Editable({target, onEdit, children}: {target: CvFieldTarget; onEdit?: (target: CvFieldTarget) => void; children: ReactNode}) {
  if (!onEdit) return <>{children}</>;
  return (
    <span
      role="button"
      tabIndex={0}
      data-editable
      className="cv-editable"
      title="Click to edit"
      onClick={() => onEdit(target)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit(target);
        }
      }}
    >
      {children}
    </span>
  );
}
