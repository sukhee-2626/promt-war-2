import type { SkillKey, TargetRole, InterviewType, TrackerStage } from '../src/types.ts';

export const SKILL_META: Record<SkillKey, { label: string; x: number; y: number }> = {
  html: { label: 'HTML', x: 50, y: 50 },
  js: { label: 'JavaScript', x: 190, y: 50 },
  react: { label: 'React', x: 340, y: 30 },
  node: { label: 'Node.js', x: 340, y: 120 },
  python: { label: 'Python', x: 50, y: 150 },
  sql: { label: 'SQL', x: 190, y: 190 },
  db: { label: 'Databases', x: 340, y: 210 },
  git: { label: 'Git', x: 50, y: 240 },
};

export const SKILL_EDGES: Array<[SkillKey, SkillKey]> = [
  ['html', 'js'],
  ['js', 'react'],
  ['js', 'node'],
  ['python', 'node'],
  ['git', 'node'],
  ['sql', 'db'],
];

export const DEFAULT_SKILLS: Record<SkillKey, number> = {
  python: 0.8,
  sql: 0.7,
  html: 0.5,
  git: 0.4,
  js: 0.25,
  react: 0.05,
  node: 0.05,
  db: 0.35,
};

export const ROLE_PLANS: Record<TargetRole, Array<{ skillKey: SkillKey; title: string; hours: number }>> = {
  'Frontend Engineer': [
    { skillKey: 'html', title: 'Semantic HTML, CSS & Accessibility', hours: 8 },
    { skillKey: 'js', title: 'JavaScript ES6+ & Async Runtime', hours: 12 },
    { skillKey: 'js', title: 'TypeScript Type Systems', hours: 8 },
    { skillKey: 'react', title: 'React Components, Hooks & State', hours: 16 },
    { skillKey: 'git', title: 'Frontend Testing, Vite & Git CI', hours: 8 },
  ],
  'Full Stack Developer': [
    { skillKey: 'js', title: 'JavaScript fundamentals', hours: 12 },
    { skillKey: 'js', title: 'TypeScript essentials', hours: 8 },
    { skillKey: 'react', title: 'React and hooks', hours: 16 },
    { skillKey: 'node', title: 'Node.js and APIs', hours: 14 },
    { skillKey: 'db', title: 'SQL databases in apps', hours: 8 },
    { skillKey: 'git', title: 'Git, Docker and CI/CD basics', hours: 6 },
  ],
  'Data Analyst': [
    { skillKey: 'sql', title: 'Statistics essentials', hours: 10 },
    { skillKey: 'sql', title: 'SQL for analysis', hours: 10 },
    { skillKey: 'python', title: 'Python with pandas', hours: 14 },
    { skillKey: 'db', title: 'Dashboards and storytelling', hours: 10 },
  ],
  'Data Scientist': [
    { skillKey: 'python', title: 'Python for data science', hours: 12 },
    { skillKey: 'sql', title: 'SQL and data pipelines', hours: 10 },
    { skillKey: 'python', title: 'Statistics and A/B testing', hours: 14 },
    { skillKey: 'python', title: 'Machine learning with scikit-learn', hours: 16 },
  ],
  'ML Engineer': [
    { skillKey: 'python', title: 'Python for machine learning', hours: 12 },
    { skillKey: 'python', title: 'Math for machine learning', hours: 14 },
    { skillKey: 'python', title: 'Model training with scikit-learn', hours: 16 },
    { skillKey: 'git', title: 'MLOps basics', hours: 10 },
  ],
  'Backend Developer': [
    { skillKey: 'node', title: 'Node.js and APIs', hours: 14 },
    { skillKey: 'db', title: 'SQL databases', hours: 10 },
    { skillKey: 'git', title: 'Docker and deployment', hours: 10 },
    { skillKey: 'node', title: 'System design basics', hours: 12 },
  ],
};

export const JD_KEYWORDS = [
  'javascript',
  'typescript',
  'react',
  'node.js',
  'sql',
  'python',
  'rest',
  'git',
  'html',
  'css',
  'docker',
  'aws',
];

export const POSITION_MARKET_DATA = [
  {
    role: 'Frontend Engineer' as TargetRole,
    demand: '9,120 postings',
    tagline: 'Interfaces, React and web performance',
    stack: 'React, TypeScript, Accessibility',
    insight: 'React 62%, TypeScript 58%, Tailwind/CSS 44%, Core Web Vitals & testing in 39% of Frontend listings.',
  },
  {
    role: 'Full Stack Developer' as TargetRole,
    demand: '7,309 postings',
    tagline: 'Web apps end to end',
    stack: 'React, TypeScript, SQL',
    insight: 'React 54%, TypeScript 45%, AWS 40%, SQL 35% of postings. TypeScript pays about $20K more (US median).',
  },
  {
    role: 'Data Analyst' as TargetRole,
    demand: '6,485 postings',
    tagline: 'Dashboards and insight',
    stack: 'SQL, Python, BI tool',
    insight: 'SQL leads at 60 to 71%, Python 44 to 53%. The 6.9% asking for GenAI skills pay about $22K more. You already hold the top two.',
  },
  {
    role: 'Data Scientist' as TargetRole,
    demand: '7,693 postings',
    tagline: 'Models and experiments',
    stack: 'Python, statistics, ML',
    insight: 'Python 63%, SQL 48%, Statistics 48%, ML 48%. A/B testing pays about $27K above the baseline.',
  },
  {
    role: 'Backend Developer' as TargetRole,
    demand: '24,600+ roles',
    tagline: 'APIs and data',
    stack: 'Node.js, SQL, Docker',
    insight: "24,600+ active roles in SeekerScore's June 2026 sample.",
  },
];

export const FULL_STACK_DEMAND_BARS = [
  ['React', 54],
  ['TypeScript', 45],
  ['CI/CD', 42],
  ['JavaScript', 42],
  ['AWS', 40],
  ['SQL', 35],
  ['Node.js', 31],
  ['Docker', 29],
] as const;

export const QUIZ_QUESTIONS = [
  {
    id: 0,
    question: 'What does typeof null return?',
    options: ['undefined', 'object', 'null', 'number'],
    answerIndex: 1,
    explanation: 'typeof null returns "object" due to a historical JavaScript quirk.',
  },
  {
    id: 1,
    question: 'Which keyword declares a block-scoped constant?',
    options: ['var', 'let', 'const', 'static'],
    answerIndex: 2,
    explanation: 'const creates a block-scoped binding that cannot be reassigned.',
  },
  {
    id: 2,
    question: 'What does await do inside an async function?',
    options: [
      'Stops the whole page',
      'Pauses until a promise settles',
      'Creates a new thread',
      'Retries on error',
    ],
    answerIndex: 1,
    explanation: 'await suspends the async function execution until the promise resolves or rejects.',
  },
];

export const JOB_CATALOG: Array<{
  id: string;
  title: string;
  company: string;
  requiredSkills: SkillKey[];
}> = [
  { id: 'job-brightwave', title: 'Junior Full Stack Developer', company: 'Brightwave', requiredSkills: ['js', 'react', 'node', 'sql'] },
  { id: 'job-pixelcraft', title: 'Frontend Engineer', company: 'Pixelcraft', requiredSkills: ['html', 'js', 'react'] },
  { id: 'job-datanest', title: 'Python Backend Developer', company: 'Datanest', requiredSkills: ['python', 'sql', 'git', 'db'] },
];

export const INTERVIEW_QUESTIONS: Record<InterviewType, string[]> = {
  Behavioral: [
    'Tell me about a time you solved a difficult problem.',
    'Describe a situation where you worked in a team under pressure.',
    'Give an example of when you received critical feedback.',
    'Tell me about a project you are most proud of.',
    'Describe a time you had to learn something quickly.',
  ],
  Technical: [
    'Explain the difference between let, const and var.',
    'How would you design a simple REST API for a library system?',
    'What happens when you type a URL into a browser?',
    'How do you debug a slow database query?',
    'How would you test a login feature?',
  ],
  HR: [
    'Walk me through your background.',
    'Why do you want this role?',
    'Where do you see yourself in three years?',
    'What are your strengths and one area to improve?',
    'What working style helps you do your best work?',
  ],
  DSA: [
    'Explain the difference between an array and a linked list, and when you would use each.',
    'How would you solve Two Sum, and what is the time complexity?',
    'Compare BFS and DFS. When would you choose each?',
    'Explain binary search and its time complexity.',
    'What is a hash map, and how are collisions handled?',
  ],
  Communication: [
    'Introduce yourself in about one minute.',
    'Explain a complex technical topic to a non-technical person.',
    'How would you handle a disagreement with a teammate?',
    'Tell me about a time you had to persuade someone.',
    'What are your strengths and one area you are improving?',
  ],
};

export const DSA_TOPICS: Array<[string, Array<[string, string]>]> = [
  ['Arrays and hashing', [['Two Sum', 'two-sum'], ['Contains Duplicate', 'contains-duplicate'], ['Group Anagrams', 'group-anagrams'], ['Top K Frequent Elements', 'top-k-frequent-elements']]],
  ['Two pointers', [['Valid Palindrome', 'valid-palindrome'], ['3Sum', '3sum'], ['Container With Most Water', 'container-with-most-water']]],
  ['Sliding window', [['Best Time to Buy and Sell Stock', 'best-time-to-buy-and-sell-stock'], ['Longest Substring Without Repeating Characters', 'longest-substring-without-repeating-characters']]],
  ['Stack and queue', [['Valid Parentheses', 'valid-parentheses'], ['Min Stack', 'min-stack']]],
  ['Linked list', [['Reverse Linked List', 'reverse-linked-list'], ['Merge Two Sorted Lists', 'merge-two-sorted-lists'], ['Linked List Cycle', 'linked-list-cycle']]],
  ['Binary search', [['Binary Search', 'binary-search']]],
  ['Trees', [['Invert Binary Tree', 'invert-binary-tree'], ['Maximum Depth of Binary Tree', 'maximum-depth-of-binary-tree']]],
  ['Graphs', [['Number of Islands', 'number-of-islands']]],
  ['Dynamic programming', [['Climbing Stairs', 'climbing-stairs'], ['House Robber', 'house-robber'], ['Coin Change', 'coin-change']]],
];

export const APTITUDE_QUESTIONS: Array<{
  section: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}> = [
  { section: 'Quant', question: 'A 120 m train passes a pole in 6 seconds. What is its speed?', options: ['54 km/h', '60 km/h', '72 km/h', '80 km/h'], answerIndex: 2, explanation: '120 m in 6 s is 20 m/s, which is 72 km/h.' },
  { section: 'Quant', question: 'What is 20% of 250 plus 15% of 200?', options: ['70', '80', '85', '90'], answerIndex: 1, explanation: '50 + 30 = 80.' },
  { section: 'Quant', question: 'Two numbers are in the ratio 3:5 and sum to 64. The larger is:', options: ['24', '32', '40', '44'], answerIndex: 2, explanation: '64 ÷ 8 = 8, and 5 × 8 = 40.' },
  { section: 'Quant', question: 'A price rises 20% and then falls 20%. The net change is:', options: ['No change', '4% decrease', '4% increase', '2% decrease'], answerIndex: 1, explanation: '1.2 × 0.8 = 0.96, a 4% decrease.' },
  { section: 'Quant', question: 'A finishes a job in 12 days and B in 24 days. Together they take:', options: ['6 days', '8 days', '9 days', '10 days'], answerIndex: 1, explanation: '1/12 + 1/24 = 1/8 per day.' },
  { section: 'Logical', question: 'Find the next number: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '46'], answerIndex: 1, explanation: 'Differences rise by 2 each time: 4, 6, 8, 10, 12.' },
  { section: 'Logical', question: 'If all A are B and all B are C, then:', options: ['All C are A', 'All A are C', 'Some C are not B', 'No A is C'], answerIndex: 1, explanation: 'The chain A to B to C means every A is a C.' },
  { section: 'Logical', question: 'If A=1, B=2, C=3 and so on, what is the value of FACE?', options: ['13', '15', '17', '19'], answerIndex: 1, explanation: '6 + 1 + 3 + 5 = 15.' },
  { section: 'Verbal', question: 'Closest in meaning to “concise”:', options: ['Brief', 'Lengthy', 'Vague', 'Complex'], answerIndex: 0, explanation: 'Concise means short and clear.' },
  { section: 'Verbal', question: 'Choose the correct word: Neither of the candidates ___ ready.', options: ['are', 'is', 'were', 'have been'], answerIndex: 1, explanation: '“Neither” takes a singular verb.' },
];

export const FLASHCARDS: Record<string, Array<[string, string]>> = {
  DSA: [
    ['Time complexity of binary search?', 'O(log n). Each step halves the search range on sorted data.'],
    ['Array vs linked list: which has O(1) index access?', 'Array. A linked list needs O(n) traversal.'],
    ['When is a hash map a good choice?', 'Fast lookup, counting and de-duplication, average O(1).'],
    ['BFS uses which structure?', 'A queue. It explores level by level.'],
    ['DFS uses which structure?', 'A stack or recursion. It explores one branch fully first.'],
    ['What is dynamic programming?', 'Solving overlapping subproblems once and reusing the results.'],
    ['When do two pointers work well?', 'On sorted data or when scanning from both ends, like pair-sum problems.'],
    ['Stable vs unstable sort?', 'A stable sort keeps the original order of equal elements.'],
  ],
  JavaScript: [
    ['let vs const?', 'Both are block scoped. const cannot be reassigned.'],
    ['What does typeof null return?', '“object”, a long-standing quirk.'],
    ['What is a closure?', 'A function that remembers variables from where it was created.'],
    ['What does await do?', 'Pauses an async function until a promise settles.'],
    ['== vs ===?', '=== compares without type conversion. Prefer it.'],
    ['What is the event loop?', 'It runs queued callbacks when the call stack is empty.'],
  ],
  Interview: [
    ['What does STAR stand for?', 'Situation, Task, Action, Result.'],
    ['How long should an answer be?', 'About 60 to 90 seconds.'],
    ['What if you do not know the answer?', 'Say so, explain your thinking, and describe how you would find out.'],
    ['How should you close an interview?', 'Ask about the team, expectations and next steps, then thank them.'],
  ],
};

export const PORTFOLIO_PROJECTS: Record<string, Array<[string, string, string, string]>> = {
  'Frontend Engineer': [
    ['Accessible Design System Kit', 'Beginner', 'React, TypeScript, ARIA', 'Reusable keyboard-navigable components with tokens'],
    ['Interactive Data Explorer', 'Intermediate', 'React, SVG Charts, Vite', 'Virtualized tables, live filters, and responsive charts'],
    ['Collaborative Canvas Workspace', 'Advanced', 'React, WebSockets, State', 'Optimistic updates, undo/redo stack, and offline cache'],
  ],
  'Full Stack Developer': [
    ['Task manager with login', 'Beginner', 'HTML, JavaScript, localStorage', 'CRUD tasks, filters and a clean responsive interface'],
    ['Expense tracker with charts', 'Intermediate', 'React, Node.js, SQL', 'Authentication, a REST API and a monthly spending chart'],
    ['Real-time chat app', 'Advanced', 'Node.js, WebSockets, React', 'Rooms, typing indicators and message history'],
  ],
  'Data Analyst': [
    ['Sales dashboard', 'Beginner', 'SQL, spreadsheets', 'Clean the data and build KPIs'],
    ['Customer churn analysis', 'Intermediate', 'Python, pandas', 'Find churn drivers and present insights'],
    ['End-to-end BI report', 'Advanced', 'SQL, Python, Power BI or Tableau', 'A repeatable pipeline and a stakeholder dashboard'],
  ],
  'Data Scientist': [
    ['A/B test analyzer', 'Beginner', 'Python, statistics', 'Hypothesis testing and confidence intervals'],
    ['Customer segmentation', 'Intermediate', 'Python, scikit-learn', 'Clustering and cohort analysis'],
    ['Forecasting service', 'Advanced', 'Python, SQL, FastAPI', 'Time-series prediction pipeline'],
  ],
  'ML Engineer': [
    ['House price predictor', 'Beginner', 'Python, scikit-learn', 'Regression with feature engineering'],
    ['Sentiment classifier', 'Intermediate', 'Python, NLP basics', 'Text cleaning and model comparison'],
    ['Deployed ML API', 'Advanced', 'Python, FastAPI, Docker', 'Train, package and serve a model with monitoring'],
  ],
  'Backend Developer': [
    ['URL shortener', 'Beginner', 'Node.js, SQL', 'Create, redirect and track clicks'],
    ['Library management API', 'Intermediate', 'Node.js, SQL, JWT', 'Authentication, roles and pagination'],
    ['Notification service', 'Advanced', 'Node.js, queues, Docker', 'Retries, rate limits and logging'],
  ],
};

export const CERTIFICATIONS: Record<string, Array<[string, string, string, string]>> = {
  'Frontend Engineer': [
    ['Meta Front-End Developer Certificate', 'Coursera', 'https://www.coursera.org/professional-certificates/meta-front-end-developer', 'React, UI/UX, and version control'],
    ['Responsive Web Design & JS', 'freeCodeCamp', 'https://www.freecodecamp.org/learn', 'Free and project based'],
  ],
  'Full Stack Developer': [
    ['freeCodeCamp certifications', 'freeCodeCamp', 'https://www.freecodecamp.org/learn', 'Free and project based'],
    ['Meta developer certificates', 'Coursera', 'https://www.coursera.org/search?query=meta%20developer%20professional%20certificate', 'Check current catalog and financial aid'],
  ],
  'Data Analyst': [
    ['Power BI Data Analyst (PL-300)', 'Microsoft', 'https://learn.microsoft.com/en-us/credentials/certifications/data-analyst-associate/', 'Exam fee applies'],
    ['Google Data Analytics certificate', 'Coursera', 'https://www.coursera.org/search?query=google%20data%20analytics%20professional%20certificate', 'Beginner friendly'],
  ],
  'Data Scientist': [
    ['IBM Data Science Professional Certificate', 'Coursera', 'https://www.coursera.org/search?query=ibm%20data%20science%20professional%20certificate', 'Hands-on labs and capstone'],
    ['Azure Data Scientist Associate', 'Microsoft', 'https://learn.microsoft.com/en-us/credentials/certifications/azure-data-scientist/', 'Cloud ML workflows'],
  ],
  'ML Engineer': [
    ['Machine Learning Specialization', 'Coursera', 'https://www.coursera.org/search?query=machine%20learning%20specialization', 'Audit free or pay for a certificate'],
    ['Azure AI Fundamentals (AI-900)', 'Microsoft', 'https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-fundamentals/', 'Entry level'],
  ],
  'Backend Developer': [
    ['AWS Certified Cloud Practitioner', 'AWS', 'https://aws.amazon.com/certification/certified-cloud-practitioner/', 'Entry-level cloud basics'],
    ['Azure Fundamentals (AZ-900)', 'Microsoft', 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/', 'Entry level'],
  ],
};

export const RESOURCES_LIBRARY: Array<[string, string, string, string, string]> = [
  ['DSA', 'NeetCode: roadmap and video solutions', 'YouTube', 'https://www.youtube.com/@NeetCode', 'Clear walkthroughs of core interview problems'],
  ['DSA', 'take U forward', 'YouTube', 'https://www.youtube.com/@takeUforward', 'Structured DSA playlists'],
  ['DSA', 'Abdul Bari', 'YouTube', 'https://www.youtube.com/@abdul_bari', 'Strong fundamentals and complexity analysis'],
  ['DSA', 'freeCodeCamp', 'YouTube', 'https://www.youtube.com/@freecodecamp', 'Long, free full courses on many topics'],
  ['DSA', 'Data structures and algorithms courses', 'Udemy', 'https://www.udemy.com/courses/search/?q=data%20structures%20and%20algorithms', 'Compare ratings and update dates before you buy'],
  ['DSA', 'LeetCode problem set', 'Practice', 'https://leetcode.com/problemset/', 'Filter by topic and difficulty'],
  ['Aptitude', 'IndiaBix aptitude practice', 'Practice', 'https://www.indiabix.com/aptitude/questions-and-answers/', 'Topic-wise questions with answers'],
  ['Aptitude', 'Aptitude shortcuts and tricks', 'YouTube', 'https://www.youtube.com/results?search_query=aptitude%20preparation%20placements', 'Quant and logical reasoning videos'],
  ['Aptitude', 'Aptitude test preparation courses', 'Udemy', 'https://www.udemy.com/courses/search/?q=aptitude%20test%20preparation', 'Timed practice sets'],
  ['Communication', 'Interview communication skills', 'YouTube', 'https://www.youtube.com/results?search_query=interview%20communication%20skills', 'Delivery, tone and structure'],
  ['Communication', 'STAR method answers', 'YouTube', 'https://www.youtube.com/results?search_query=STAR%20method%20interview%20answers', 'Worked examples for behavioral questions'],
  ['Communication', 'Communication skills courses', 'Udemy', 'https://www.udemy.com/courses/search/?q=communication%20skills', 'Speaking, writing and presenting'],
  ['Communication', 'Coursera communication courses', 'Free course', 'https://www.coursera.org/search?query=communication%20skills', 'Many can be audited for free'],
  ['Web and general', 'roadmap.sh', 'Free course', 'https://roadmap.sh', 'Visual learning paths by role'],
  ['Web and general', 'MDN Web Docs', 'Free course', 'https://developer.mozilla.org/en-US/docs/Learn', 'Reference-quality web fundamentals'],
];

export const LEARN_MODULES = [
  {
    id: 'mdn-js',
    title: 'MDN: JavaScript guide',
    kind: 'Docs',
    domain: 'developer.mozilla.org',
    url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript',
    reason: 'Matches your gap: functions and scope',
  },
  {
    id: 'js-info',
    title: 'javascript.info',
    kind: 'Tutorial',
    domain: 'javascript.info',
    url: 'https://javascript.info',
    reason: 'Clear closures chapter for your level',
  },
  {
    id: 'fcc-js',
    title: 'freeCodeCamp: JavaScript',
    kind: 'Course',
    domain: 'freecodecamp.org',
    url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/',
    reason: 'Practice exercises after reading',
  },
];

export const ONBOARDING_INTERESTS = [
  ['web', 'Web apps and interfaces'],
  ['data', 'Data and analytics'],
  ['ai', 'AI and machine learning'],
  ['backend', 'APIs and backend systems'],
  ['cloud', 'Cloud and DevOps'],
] as const;

export const INTEREST_ROLE_MAP: Record<string, TargetRole> = {
  web: 'Full Stack Developer',
  data: 'Data Analyst',
  ai: 'ML Engineer',
  backend: 'Backend Developer',
  cloud: 'Backend Developer',
};

export const TRACKER_STAGES: TrackerStage[] = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];

export const INTERVIEW_TIPS: Record<string, string> = {
  Communication: 'Cut filler words and keep answers to about 90 seconds.',
  Structure: 'Use Situation, Task, Action, Result so the story is easy to follow.',
  'Relevance and depth': 'Answer the exact question and add one concrete detail or number.',
  Confidence: 'State decisions directly instead of hedging with “I think” or “maybe”.',
};

export const CALIBRATION_QUOTES = [
  {
    quote: 'Your résumé is a story. Make sure every line earns its place.',
    author: 'place1ai RAG Mentor',
  },
  {
    quote: 'Master the prerequisite before the framework; Critic verifies every dependency.',
    author: 'place1ai Multi-Agent Engine',
  },
  {
    quote: 'Small daily BKT calibration beats passive binge-watching every week.',
    author: 'place1ai Skill Twin',
  },
];

export const DAILY_CHALLENGES = [
  {
    id: 'dc-event-loop',
    title: 'JavaScript Event Loop & Microtasks',
    topic: 'Frontend & Runtime',
    xp: 45,
    prompt:
      'In a browser runtime, console.log("A"), setTimeout(fn, 0), and Promise.resolve().then(fn2) are queued in that exact order inside a synchronous script. Which order logs to the console?',
    options: [
      'A → setTimeout → Promise',
      'A → Promise → setTimeout',
      'Promise → A → setTimeout',
      'setTimeout → Promise → A',
    ],
    answerIndex: 1,
    explanation:
      'Synchronous code executes first ("A"), then the microtask queue drains completely (Promise callback) before the next macrotask (setTimeout).',
  },
  {
    id: 'dc-react-keys',
    title: 'React Reconciliation & Stable Keys',
    topic: 'Frontend Engineering',
    xp: 45,
    prompt:
      'When rendering a sortable list of editable inputs in React, what bug occurs if you pass the array index as the key?',
    options: [
      'React refuses to compile JSX',
      'Component local state stays bound to the wrong item after sorting',
      'useEffect runs twice in production',
      'CSS transitions become synchronous',
    ],
    answerIndex: 1,
    explanation:
      'React matches component instances by key; index keys shift when items reorder, causing state/DOM mismatch.',
  },
  {
    id: 'dc-sql-index',
    title: 'SQL Composite Index Ordering',
    topic: 'Backend & Databases',
    xp: 45,
    prompt:
      'Given index idx_orders_user_created ON orders(user_id, created_at), which query benefits most from the B-Tree index without a full scan?',
    options: [
      'WHERE created_at > "2026-01-01" alone',
      'WHERE user_id = 42 AND created_at > "2026-01-01"',
      'ORDER BY total_amount DESC',
      'WHERE LOWER(email) LIKE "%@gmail.com"',
    ],
    answerIndex: 1,
    explanation:
      'B-Tree composite indexes follow the leftmost prefix rule: filtering by user_id first enables range scan on created_at.',
  },
];

export const CORE_CONCEPTS: Array<{
  id: string;
  skillKey: SkillKey;
  title: string;
  track: string;
  summary: string;
  keyTakeaways: string[];
  ragPrompt: string;
}> = [
  {
    id: 'cc-react-render',
    skillKey: 'react',
    title: 'React Rendering, Reconciliation & Derived State',
    track: 'Frontend Core',
    summary:
      'Understand how React diffs Virtual DOM trees, why pure render functions prevent cascading re-renders, and when to compute derived values directly instead of duplicating state in useEffect.',
    keyTakeaways: [
      'Compute derived values during render rather than syncing with useEffect',
      'Preserve component state across reorders with stable domain IDs as keys',
      'Colocate state close to where it is consumed to limit subtree renders',
    ],
    ragPrompt: 'How should I prioritize React concepts given my current Skill Twin mastery?',
  },
  {
    id: 'cc-js-closures',
    skillKey: 'js',
    title: 'Closures, Lexical Scope & Async Event Loop',
    track: 'JavaScript Runtime',
    summary:
      'Every async handler, React hook, and debouncer depends on lexical closures and how microtasks preempt macrotasks in the event loop.',
    keyTakeaways: [
      'Closures retain references to outer lexical variables after the outer call returns',
      'Microtasks (Promises/queueMicrotask) drain before the next paint or timer',
      'Cleanup stale async effects with AbortController or cancellation flags',
    ],
    ragPrompt: 'Why is JavaScript closures and async first in my roadmap?',
  },
  {
    id: 'cc-html-a11y',
    skillKey: 'html',
    title: 'Semantic Landmarks, ARIA & Keyboard Navigation',
    track: 'UI Craft & Accessibility',
    summary:
      'Accessible interfaces pass WCAG AA contrast, maintain logical heading hierarchies, and support full keyboard traversal.',
    keyTakeaways: [
      'Use native <button>, <a>, and <main> before adding ARIA roles',
      'Ensure >= 40px touch targets and visible :focus-visible rings',
      'Pair color indicators with explicit text labels for color-blind users',
    ],
    ragPrompt: 'Which accessibility and frontend skills matter most for Frontend Engineer roles?',
  },
  {
    id: 'cc-node-rest',
    skillKey: 'node',
    title: 'REST API Design, Rate Limiting & Error Contracts',
    track: 'Backend & APIs',
    summary:
      'Design predictable HTTP endpoints with schema validation, idempotency, structured JSON errors, and non-blocking I/O.',
    keyTakeaways: [
      'Validate payloads at the boundary and return semantic HTTP 400/401/404/429 codes',
      'Never block the Node event loop with synchronous CPU loops or sync fs in handlers',
      'Use parameterized queries to prevent SQL injection',
    ],
    ragPrompt: 'What backend & API skills are missing from my Skill Twin right now?',
  },
  {
    id: 'cc-sql-perf',
    skillKey: 'sql',
    title: 'Relational Joins, Indexing & Query Plans',
    track: 'Data & Storage',
    summary:
      'Master INNER vs LEFT joins, GROUP BY vs HAVING, and how B-Tree leftmost prefix indexes eliminate sequential scans.',
    keyTakeaways: [
      'WHERE filters rows pre-aggregation; HAVING filters grouped aggregates',
      'Avoid wrapping indexed columns in functions inside WHERE clauses',
      'Use transactions (ACID) for multi-step mutations',
    ],
    ragPrompt: 'Compare my SQL readiness for Full Stack vs Data Analyst jobs.',
  },
];
