# LegalSaathi

> **Understand your legal documents in plain language**

> **H25 Challenge Alignment:** This project directly addresses the
> "AI for Legal Assistance & Access" problem statement by simplifying
> complex legal documents, highlighting important clauses and risks,
> and preparing users for conversations with legal professionals.

LegalSaathi is an AI-powered legal document comprehension and analysis assistant designed to simplify dense legal contracts and empower citizens with accessible legal intelligence.

---

[![CI](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](#)

---

## Problem Statement (from H25)

> "Legal information can often be complex, difficult to understand, and
> challenging to navigate without professional assistance."

**How LegalSaathi addresses each barrier:**

- **Complexity** → plain-language summaries and clause-by-clause breakdown
- **Navigation** → clause citations with risk scores
- **Access** → free, instant, no login required
- **Trust** → explicit "not legal advice" disclaimer + lawyer prep output

---

## Solution Overview

LegalSaathi bridges the gap between complex legal documents and everyday understanding:

- **Plain-Language Translation**: Deconstructs complex legalese into simple, conversational explanations without losing legal nuance.
- **Key Clause Identification**: Automatically highlights termination terms, indemnity liabilities, payment schedules, and jurisdiction clauses.
- **Risk & Red-Flag Detection**: Identifies one-sided terms, ambiguous penalty calculations, and compliance anomalies.
- **Interactive Q&A Companion**: Enables users to ask natural-language questions directly against their uploaded documents using grounded RAG.
- **Contract Comparison**: Compares contract revisions side-by-side to highlight material alterations before signing.

---

## Key Features

- [x] Multi-format document ingestion (PDF, DOCX, TXT up to 10MB)
- [x] In-memory document parsing and sanitization pipeline
- [x] Accessible WCAG 2.1 AA compliant UI with screen reader announcements
- [x] Plain-language clause-by-clause breakdown
- [x] Executive summary generation with key takeaways
- [x] Critical risk and red-flag scoring
- [x] Grounded document question answering (RAG)
- [x] Privacy-first client-side document redaction
- [x] Responsive, accessible design with dark mode

---

## Tech Stack

| Layer             | Technology                | Purpose                                                    |
| :---------------- | :------------------------ | :--------------------------------------------------------- |
| **Framework**     | Next.js (App Router)      | Full-stack React framework with SSR and API routes         |
| **Language**      | TypeScript (Ultra-Strict) | Type safety, maintainability, zero `any` policy            |
| **Styling**       | Tailwind CSS              | Modern, responsive, utility-first design system            |
| **UI Components** | shadcn/ui & Lucide Icons  | Accessible, high-aesthetic component library               |
| **Generative AI** | Google Gemini API         | Structured clause extraction, summarization, and reasoning |
| **Validation**    | Zod                       | Runtime schema validation for env vars and API payloads    |
| **Testing**       | Vitest & Testing Library  | Fast unit testing for parser and security boundaries       |
| **Deployment**    | Vercel                    | Production edge hosting with automated CI/CD               |

---

## Architecture

```
[User / Browser]
       │
       ▼ (Multipart Form / drag-and-drop)
[Next.js Server API: /api/parse]
       │
       ├─► MIME Type & Size Validation (10MB Limit)
       ├─► Buffer-based Extraction (pdf-parse / mammoth)
       ├─► Text Sanitization & OCR Warning Checks
       └─► Returns Structured ParsedDocument JSON
```

---

## Setup Instructions

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- A Google Gemini API Key

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/legalsaathi.git
   cd legalsaathi
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and add your valid `GEMINI_API_KEY`.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable              | Required | Description                              | Example                 |
| :-------------------- | :------- | :--------------------------------------- | :---------------------- |
| `GEMINI_API_KEY`      | Yes      | Google Gemini API Key for LLM operations | `AIzaSy...`             |
| `NEXT_PUBLIC_APP_URL` | Yes      | Application base URL                     | `http://localhost:3000` |

---

## Running Tests & Quality Checks

```bash
# Type check with strict TypeScript compiler
npm run type-check

# Run strict linter with 0 warnings policy
npm run lint:strict

# Check code formatting with Prettier
npm run format:check

# Auto-format codebase
npm run format

# Run Vitest test suite
npm run test

# Production build verification
npm run build
```

---

## Deployment

LegalSaathi is optimized for one-click deployment on [Vercel](https://vercel.com):

1. Import the repository into your Vercel Dashboard.
2. Configure the environment variables (`GEMINI_API_KEY`, `NEXT_PUBLIC_APP_URL`).
3. Deploy! Vercel automatically runs the build pipeline and provides edge CDN caching.

---

## Hackathon Evaluation Alignment

| Criteria                        | Our Implementation                                                                                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Code Quality**                | Strict TypeScript (no any), ESLint 0-warnings, Prettier via Husky, JSDoc with @param/@returns/@throws/@example on every export, modular architecture (types/, lib/, components/legal/), barrel exports, conventional commits                          |
| **Security**                    | Zod env validation, MIME whitelist (PDF/DOCX/TXT only), 10MB size cap, in-memory parsing (no disk writes), no stack trace leakage, CSP-lite security headers, .env isolation, server-only route handlers                                              |
| **Efficiency**                  | Next.js 16 Turbopack, React Server Components, streaming-ready architecture, minimal client bundle, serverExternalPackages for native modules                                                                                                         |
| **Testing**                     | Vitest unit tests with criteria-tagged describe blocks (Security / Problem Alignment / Code Quality), CI on every push (lint + type-check + format + build)                                                                                           |
| **Accessibility**               | Semantic HTML5 (main, section, header, footer), ARIA labels & roles on all interactive elements, aria-live for async status, keyboard navigation, focus-visible rings, skip-to-content link, WCAG AA contrast, screen-reader-tested heading hierarchy |
| **Problem Statement Alignment** | Directly solves legal document complexity for non-lawyers: plain-language summaries, clause citations, risk scoring, lawyer prep, multi-format document ingestion, non-advice disclaimer                                                              |

---

## Disclaimer

This tool provides legal information for educational and comprehension purposes only, and does not constitute formal legal advice. Consult a qualified legal professional for your specific legal matters.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
