/** Build-time UI gate. The server has a separate runtime kill switch. */
export const PUBLIC_PEOPLE_RESEARCH_ENABLED = import.meta.env.VITE_PEOPLE_RESEARCH_ENABLED === 'true';
