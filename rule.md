Next.js Refactoring Project Prompt

Overview

We aim to refactor an existing React project into Next.js (latest version with the App Router). While retaining the current design and layout, we aim for a flexible architecture to accommodate future development and enhancements. Ensuring responsiveness across various devices and screen sizes is crucial.

Technology Stack & Libraries

Next.js (latest App Router)

Tailwind CSS combined with Material UI (MUI) for styling and UI components

State management with React Query (TanStack Query) for asynchronous data handling and Zustand for UI state management

User authentication using NextAuth.js, supporting Naver and Kakao social logins with a separate admin login mechanism

Supabase for database and file storage, implementing custom JWT authentication and Row-Level Security (RLS) without Supabase Auth

Rich text editor using TipTap or React Quill

Progressive Web App (PWA) capabilities via next-pwa, aiming for a high Lighthouse PWA score

Recommended Next.js Project Structure (App Router based)

app/
├── layout.tsx  
├── page.tsx  
├── (auth)/
│ ├── login/page.tsx
│ └── admin-login/page.tsx
├── admin/
│ ├── layout.tsx
│ └── page.tsx
├── notice/page.tsx  
├── questions/page.tsx  
├── timeline/page.tsx  
├── slide/page.tsx  
├── api/
│ ├── auth/route.ts
│ └── notice/route.ts
├── \_components/
│ ├── Header.tsx
│ ├── Footer.tsx
│ └── ...
├── \_lib/
│ ├── supabaseClient.ts
│ └── auth.ts
└── globals.css

Development Principles to Implement

Apply the Atomic Design methodology to create reusable components, ensuring co-location of feature-related components within their respective page directories.

Leverage Server Components extensively for improved initial loading performance and SEO optimization.

Implement service workers and offline caching strategies to enhance PWA functionality.

Utilize Next.js built-in <Image> component for optimized image delivery.

Codex Development Guidelines

Reuse as much existing React component logic as possible while restructuring according to Next.js' file-based routing.

Replace existing styling with Tailwind CSS primarily, complemented with MUI components only when necessary, to maintain a cohesive design system.

Handle all asynchronous data interactions with React Query and manage global UI state using Zustand.

Fully transition user authentication to NextAuth.js, with distinct login flows for general users and administrators.

Create a secure data access layer using Supabase in conjunction with Next.js server actions or API routes, incorporating custom JWT authentication and RLS.

Ensure all pages are responsive and deliver an optimized user experience across diverse devices.

Integrate PWA capabilities and continuously monitor performance using Lighthouse.

Use this comprehensive guideline to systematically refactor the React project into Next.js.
