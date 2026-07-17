import type {CvDocument} from '../cv/schema';

/**
 * Removes personally identifying contact details before a CV is sent to the
 * cloud provider. Employment content (employers, roles, dates, achievements) is
 * intentionally preserved because analysis depends on it; this is disclosed to
 * the user through the cloud consent notice. Item IDs are untouched so that
 * client-side grounding of suggestions and matches keeps working against the
 * original, unredacted document.
 */
export function redactCvForCloud(document: CvDocument): CvDocument {
  return {
    ...document,
    title: '',
    basics: {
      ...document.basics,
      fullName: '',
      email: '',
      phone: undefined,
      location: undefined,
      website: '',
      links: [],
    },
  };
}
