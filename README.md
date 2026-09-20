# LegalSaathi

> **Understand your legal documents in plain language**

LegalSaathi is an AI-powered legal document comprehension and analysis assistant designed to simplify dense legal contracts and empower citizens with accessible legal intelligence.

---

[![CI](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](#)

---

## Problem Statement

Navigating legal contracts and compliance documents in India and globally presents a severe accessibility barrier for non-lawyers, small business owners, and everyday citizens. Traditional legal terminology is dense, opaque, and deliberately complex, often leading individuals to sign agreements without fully comprehending binding obligations, hidden liabilities, and unfair penalty clauses.

Furthermore, seeking immediate, preliminary legal review from attorneys is often cost-prohibitive and time-consuming for routine agreements like rent agreements, employment offers, non-disclosure agreements, and service contracts. There is an urgent need for an ethical, accurate, and accessible AI companion that translates legal jargon into clear, actionable plain language.

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
| **Deployment**    | Vercel                    | Production edge hosting with automated CI/CD               |

---

## Architecture

> _Architecture diagram coming soon._

LegalSaathi uses Next.js server actions and API route handlers to parse documents, extract text chunks, compute semantic embeddings, and query Google Gemini models with structured prompt templates.

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

| Evaluation Criteria   | LegalSaathi Implementation Strategy                                                               |
| :-------------------- | :------------------------------------------------------------------------------------------------ |
| **Code Quality**      | Strict TypeScript, Prettier, ESLint 0-warnings rule, Husky pre-commit hooks, CI workflow          |
| **Security**          | Zod schema validation, strict env parsing, zero API key exposure to client, secure file ingestion |
| **Efficiency**        | Next.js Server Components, optimized streaming LLM responses, minimal client bundle               |
| **Testing**           | Modular architecture with dedicated `/tests` suite and CI pipeline on every push                  |
| **Accessibility**     | Semantic HTML5, ARIA labels, contrast-compliant theme, keyboard navigable UI                      |
| **Problem Alignment** | Tackles legal document opacity directly through simplified plain-language assistance              |

---

## Roadmap

- **Day 1**: Document ingestion & parsing pipeline (PDF, DOCX, TXT)
- **Day 2**: Gemini API integration & structured legal prompt engineering
- **Day 3**: Plain-language summary & clause risk classification engine
- **Day 4**: Interactive document Q&A companion with grounded RAG
- **Day 5**: UI/UX polish with shadcn/ui, animations, and dark mode
- **Day 6**: End-to-end integration testing, edge cases & performance benchmarking
- **Day 7**: Demo preparation, user acceptance testing, and final hackathon submission

---

## Disclaimer

This tool provides legal information for educational and comprehension purposes only, and does not constitute formal legal advice. Consult a qualified legal professional for your specific legal matters.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
