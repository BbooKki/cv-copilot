import type {CvDocument} from './schema';

export const sampleCv: CvDocument = {
  schemaVersion: 1,
  id: 'cv-sample-dylan',
  title: 'Software Engineer CV',
  basics: {
    fullName: 'Dylan Islom',
    headline: 'Full-Stack Software Engineer',
    email: 'dylan@example.com',
    phone: '+82 10 0000 0000',
    location: 'Seoul, South Korea',
    website: 'https://github.com/BbooKki',
    links: [{id: 'link-github', label: 'GitHub', url: 'https://github.com/BbooKki'}],
  },
  summary: 'Software engineer with 4+ years of experience building full-stack products, mobile applications, real-time systems, and AI-enabled workflows.',
  experience: [
    {
      id: 'exp-the-join',
      company: 'The Join',
      role: 'Mobile Developer',
      location: 'Seoul, South Korea',
      startDate: 'Jul 2025',
      current: true,
      highlights: [
        {id: 'hl-health-apps', text: 'Led development and operation of four digital healthcare applications.'},
        {id: 'hl-flutter', text: 'Architected a Flutter Clean Architecture system with 15+ modules and 45+ controllers.'},
        {id: 'hl-dashboard', text: 'Engineered a medical dashboard for 10+ vital signs with real-time Socket.IO streaming.'},
      ],
    },
    {
      id: 'exp-innovatech',
      company: 'Innovatech Development',
      role: 'Full Stack Developer',
      location: 'Moscow, Russia',
      startDate: 'Oct 2022',
      endDate: 'Feb 2025',
      current: false,
      highlights: [
        {id: 'hl-monorepo', text: 'Built production NestJS monorepo systems with hybrid GraphQL and REST APIs.'},
        {id: 'hl-ble', text: 'Developed Flutter applications with Kotlin and Swift bridges for BLE and GATT support.'},
      ],
    },
  ],
  education: [
    {
      id: 'edu-bufs',
      institution: 'Busan University of Foreign Studies',
      qualification: "Master's Program",
      field: 'AI and Convergence',
      location: 'Busan, South Korea',
      startDate: '2023',
      endDate: '2025',
      highlights: [],
    },
  ],
  projects: [
    {
      id: 'project-flowshop',
      name: 'Flowshop',
      description: 'E-commerce product with real-time chat and advanced filtering.',
      technologies: ['NestJS', 'GraphQL', 'MongoDB', 'Next.js', 'WebSocket'],
      highlights: [{id: 'hl-skus', text: 'Designed for responsive filtering across 20k+ SKUs.'}],
    },
  ],
  skills: [
    {id: 'skill-backend', name: 'Backend', keywords: ['Node.js', 'NestJS', 'TypeScript', 'MongoDB', 'GraphQL']},
    {id: 'skill-frontend', name: 'Frontend', keywords: ['React', 'Next.js', 'Vue.js 3', 'Tailwind CSS']},
    {id: 'skill-mobile', name: 'Mobile', keywords: ['Flutter', 'Dart', 'Kotlin', 'Swift', 'BLE']},
  ],
  languages: [
    {id: 'lang-english', language: 'English', proficiency: 'Full professional proficiency'},
    {id: 'lang-korean', language: 'Korean', proficiency: 'Pre-intermediate'},
  ],
  customSections: [],
  settings: {templateId: 'modern', accentColor: '#262626', pageSize: 'A4'},
  updatedAt: '2026-07-17T00:00:00.000Z',
};

export const sampleJobText = `Senior Full-Stack Engineer

We are looking for an engineer experienced with TypeScript, React, Node.js, GraphQL, and real-time product development. The successful candidate will design reliable APIs, collaborate across frontend and backend, and communicate technical decisions clearly. Experience with mobile development and AI-enabled products is a plus.`;
