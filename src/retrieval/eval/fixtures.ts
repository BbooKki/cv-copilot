import type {BankEntry} from '../../bank/schema';

/**
 * Labeled retrieval set for a fictional developer. Each job lists the bank
 * entries a careful human would pick for it. Used by `eval.test.ts` (keyword
 * baseline) and `scripts/eval-retrieval` (hybrid with the real embedding model).
 */
const at = '2026-01-01T00:00:00.000Z';
const entry = (id: string, title: string, text: string, tags: string[], context?: string): BankEntry => ({id, title, text, tags, context, updatedAt: at});

export const evalBank: BankEntry[] = [
  entry('b-rbac', 'Role-based admin access', 'Designed role-based access control so each admin level sees only its menus and real-time channels.', ['Vue 3', 'TypeScript', 'security'], 'Health platform · 2025'),
  entry('b-excel', 'Bulk payments from Excel', 'Built an admin screen that validates uploaded Excel files and creates participant payments in bulk.', ['Vue 3', 'file upload'], 'Health platform · 2025'),
  entry('b-charts-web', 'Health data charts', 'Built Chart.js charts for blood pressure and step data in the admin dashboard.', ['Chart.js', 'dashboards'], 'Health platform · 2025'),
  entry('b-batch-monitor', 'Batch job monitoring', 'Built a monitoring dashboard showing the status, duration and failures of nightly batch jobs.', ['monitoring', 'dashboards'], 'Health platform · 2025'),
  entry('b-stale', 'Stale response fix', 'Fixed a race where slow API responses overwrote newer data by discarding out-of-date requests.', ['TypeScript', 'reliability'], 'Health platform · 2025'),
  entry('b-ble', 'BLE wearable reconnection', 'Stabilized Bluetooth LE pairing and reconnection with wearables, fixing GATT null crashes and reconnect race conditions.', ['Flutter', 'BLE', 'GATT'], 'Health app · 2025'),
  entry('b-flchart', 'Mobile health charts', 'Built fl_chart graphs and a meal-logging feature in the Flutter app.', ['Flutter', 'fl_chart'], 'Health app · 2025'),
  entry('b-error', 'Error handling redesign', 'Redesigned error handling so temporary API failures show a retry message instead of a full error screen.', ['Flutter', 'UX'], 'Health app · 2025'),
  entry('b-tests', 'Widget and unit tests', 'Wrote Flutter widget and unit tests and set up crash tracking with Sentry and Crashlytics.', ['testing', 'Sentry'], 'Health app · 2025'),
  entry('b-fastlane', 'Release automation', 'Unified iOS and Android Fastlane lanes and generated tester release notes from the CHANGELOG.', ['Fastlane', 'CI/CD'], 'Health app · 2026'),
  entry('b-graphql', 'GraphQL API monorepo', 'Designed a NestJS monorepo exposing GraphQL and REST APIs for a commerce product.', ['NestJS', 'GraphQL'], 'Agency · 2023'),
  entry('b-mongo', 'Faster MongoDB queries', 'Rewrote MongoDB aggregation pipelines with indexes to speed up slow listing endpoints.', ['MongoDB', 'performance'], 'Agency · 2023'),
  entry('b-docker', 'Server deployment', 'Set up Docker and NGINX deployment with monitoring on Ubuntu servers.', ['Docker', 'NGINX', 'Linux'], 'Agency · 2024'),
  entry('b-socket', 'Real-time sync', 'Implemented JWT authentication and real-time data sync with Socket.IO for an internal CRM.', ['Socket.IO', 'JWT'], 'Fintech · 2021'),
  entry('b-yolo', 'Drowsiness detection thesis', 'Trained a YOLO model in PyTorch on a self-labeled Roboflow dataset to detect driver drowsiness.', ['PyTorch', 'computer vision'], 'University · 2025'),
  entry('b-webgpu', 'LLM in the browser', 'Ran a 2 GB language model in a Web Worker with WebGPU so prompts never leave the device.', ['WebGPU', 'LLM'], 'Side project · 2026'),
];

export type EvalJob = {id: string; language: 'en' | 'ko'; text: string; relevant: string[]};

export const evalJobs: EvalJob[] = [
  {
    id: 'admin-frontend',
    language: 'en',
    text: `Frontend Engineer (Admin Console)
- Build admin screens in Vue 3 and TypeScript
- Implement permission-based access for different operator roles
- Handle bulk data imports from spreadsheets
- Visualize operational data with charts`,
    relevant: ['b-rbac', 'b-excel', 'b-charts-web'],
  },
  {
    id: 'flutter-iot',
    language: 'en',
    text: `Flutter Developer – Connected Devices
- Develop Flutter apps that connect to Bluetooth Low Energy sensors
- Debug pairing and connection stability issues
- Write widget tests and monitor crashes in production`,
    relevant: ['b-ble', 'b-tests'],
  },
  {
    id: 'monitoring-dashboard',
    language: 'en',
    text: `Web Developer, Monitoring Platform
- Build real-time monitoring dashboards for equipment status
- Present time-series data clearly with charting libraries
- Keep the UI consistent when data arrives out of order`,
    relevant: ['b-batch-monitor', 'b-charts-web', 'b-stale'],
  },
  {
    id: 'backend-node',
    language: 'en',
    text: `Backend Engineer (Node.js)
- Design GraphQL APIs with NestJS
- Optimize MongoDB queries and indexes
- Deploy services with Docker behind NGINX`,
    relevant: ['b-graphql', 'b-mongo', 'b-docker'],
  },
  {
    id: 'mobile-release',
    language: 'en',
    text: `Mobile Engineer
- Own the iOS and Android release pipeline
- Automate beta distribution to testers
- Improve app resilience when the network is unreliable`,
    relevant: ['b-fastlane', 'b-error'],
  },
  {
    id: 'paraphrase-console',
    language: 'en',
    text: `Operators must only see the parts of the console they are authorized for.
You will also let them load hundreds of records at once from a file instead of typing them in.`,
    relevant: ['b-rbac', 'b-excel'],
  },
  {
    id: 'paraphrase-sensors',
    language: 'en',
    text: `Our app keeps dropping its link to wearable sensors and sometimes crashes when they come back.
Help us make device connectivity dependable.`,
    relevant: ['b-ble'],
  },
  {
    id: 'ko-dashboard',
    language: 'ko',
    text: `프론트엔드 개발자 (설비 모니터링)
- 실시간 모니터링 대시보드 개발
- 차트 라이브러리를 활용한 데이터 시각화
- 관리자 권한별 메뉴 접근 제어 구현`,
    relevant: ['b-batch-monitor', 'b-charts-web', 'b-rbac'],
  },
  {
    id: 'ko-ai',
    language: 'ko',
    text: `AI 엔지니어
- 컴퓨터 비전 모델 학습 및 데이터셋 구축
- 온디바이스 LLM 추론 최적화`,
    relevant: ['b-yolo', 'b-webgpu'],
  },
];
