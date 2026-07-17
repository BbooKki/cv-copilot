import {describe, expect, it} from 'vitest';
import {adaptJobPageUrl} from './jobSiteAdapters';

describe('job-site adapters', () => {
  it('uses Saramin readable job-detail pages', () => {
    const source = new URL('https://saramin.co.kr/zf_user/jobs/relay/view?rec_idx=54335112&searchword=frontend');
    expect(adaptJobPageUrl(source).toString()).toBe('https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=54335112&rec_seq=0');
  });

  it('does not adapt malformed IDs or unrelated hosts', () => {
    const malformed = new URL('https://saramin.co.kr/zf_user/jobs/relay/view?rec_idx=../../secret');
    const unrelated = new URL('https://example.com/jobs/123');
    expect(adaptJobPageUrl(malformed)).toBe(malformed);
    expect(adaptJobPageUrl(unrelated)).toBe(unrelated);
  });
});
