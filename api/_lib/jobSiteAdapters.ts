const SARAMIN_HOSTS = new Set(['saramin.co.kr', 'www.saramin.co.kr']);

export function adaptJobPageUrl(sourceUrl: URL): URL {
  if (!SARAMIN_HOSTS.has(sourceUrl.hostname.toLowerCase())) return sourceUrl;
  const recIdx = sourceUrl.searchParams.get('rec_idx');
  if (!recIdx || !/^\d{1,12}$/.test(recIdx)) return sourceUrl;

  const detailUrl = new URL('https://www.saramin.co.kr/zf_user/jobs/relay/view-detail');
  detailUrl.searchParams.set('rec_idx', recIdx);
  detailUrl.searchParams.set('rec_seq', '0');
  return detailUrl;
}
