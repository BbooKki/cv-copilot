import type {CvDocument} from './schema';

export const testCv: CvDocument = {
  schemaVersion: 1,
  id: 'cv-test-fixture',
  title: 'Product Engineer CV',
  basics: {
    fullName: 'Alex Morgan',
    headline: 'Product Engineer',
    email: 'alex.morgan@example.com',
    phone: '+1 555 010 2040',
    location: 'Portland, Oregon',
    website: 'https://example.com/alex-morgan',
    links: [{id: 'link-portfolio', label: 'Portfolio', url: 'https://example.com/alex-morgan'}],
  },
  summary: 'Product engineer experienced in building accessible web applications, reliable APIs, and real-time product features.',
  experience: [
    {
      id: 'exp-northstar',
      company: 'Northstar Labs',
      role: 'Product Engineer',
      location: 'Portland, Oregon',
      startDate: '2023',
      current: true,
      highlights: [
        {id: 'hl-delivery', text: 'Led development and operation of three customer-facing workflow tools.'},
        {id: 'hl-dashboard', text: 'Built a real-time operations dashboard with typed event streams and accessible data views.'},
      ],
    },
  ],
  education: [
    {
      id: 'edu-metro',
      institution: 'Metro University',
      qualification: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2018',
      endDate: '2022',
      highlights: [],
    },
  ],
  projects: [
    {
      id: 'project-atlas',
      name: 'Atlas Dashboard',
      description: 'An accessible dashboard for monitoring distributed product operations.',
      technologies: ['TypeScript', 'React', 'Node.js'],
      highlights: [{id: 'hl-atlas', text: 'Designed a reusable component system for dense operational data.'}],
    },
  ],
  skills: [
    {id: 'skill-backend', name: 'Engineering', keywords: ['TypeScript', 'React', 'Node.js', 'PostgreSQL']},
  ],
  languages: [{id: 'lang-english', language: 'English', proficiency: 'Native'}],
  customSections: [],
  settings: {templateId: 'modern', accentColor: '#262626', pageSize: 'A4', density: 'comfortable'},
  updatedAt: '2026-01-01T00:00:00.000Z',
};
