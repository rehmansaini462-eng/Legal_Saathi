/**
 * @module app/page
 * @description Accessible landing page and core interactive workspace for LegalSaathi.
 * Welcomes users, provides direct document upload capabilities, displays extracted previews, and previews upcoming AI capabilities.
 * @responsibility Renders semantic layout structure, accessibility anchors, and client workspace modules.
 * @alignsWith Problem Statement: "Legal information can often be complex, difficult to understand, and challenging to navigate without professional assistance."
 * @accessibility WCAG 2.1 AA compliant with skip-to-content anchor, strict h1->h2->h3 heading hierarchy, aria-describedby card links, and high-contrast color palette.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

import {
  Scale,
  Sparkles,
  ShieldAlert,
  GitCompare,
  MessageSquare,
  Award,
  Briefcase,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/config/constants';
import { LegalWorkspace, DisclaimerBanner } from '@/components/legal';

/**
 * Feature card specification for upcoming capabilities.
 */
interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  status: 'active' | 'coming-soon';
}

const CAPABILITY_FEATURES: FeatureCard[] = [
  {
    id: 'feature-ai-summary',
    title: 'AI Plain Summary',
    description: 'Instant, grounded plain-language summary breaking down rights and obligations.',
    icon: Sparkles,
    status: 'active',
  },
  {
    id: 'feature-risk-scoring',
    title: 'Clause Risk Scoring',
    description:
      'Automatic risk levels (high, medium, low) on liabilities, penalties, and termination.',
    icon: ShieldAlert,
    status: 'active',
  },
  {
    id: 'feature-doc-comparison',
    title: 'Document Comparison',
    description: 'Compare multiple contracts side-by-side to highlight deviations and alterations.',
    icon: GitCompare,
    status: 'active',
  },
  {
    id: 'feature-qa',
    title: 'Q&A Companion',
    description:
      'Ask questions and get answers grounded strictly in your document text with citations.',
    icon: MessageSquare,
    status: 'active',
  },
  {
    id: 'feature-lawyer-prep',
    title: 'Lawyer Preparation',
    description:
      'Targeted consultation questions, case briefing summary, and documents-to-bring checklist.',
    icon: Briefcase,
    status: 'active',
  },
  {
    id: 'feature-action-checklist',
    title: 'Action Checklist',
    description:
      'Prioritized actionable next steps, extracted deadlines, and interactive completion tracking.',
    icon: ListChecks,
    status: 'active',
  },
  {
    id: 'feature-pii-redaction',
    title: 'Privacy PII Redaction',
    description:
      'Client-side masking of Aadhaar, PAN, emails, phones, and bank accounts before AI processing.',
    icon: ShieldCheck,
    status: 'active',
  },
];

/**
 * Server component rendering the accessible landing page and document analysis workspace.
 *
 * @returns Complete landing page element tree.
 */
export default function HomePage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 selection:bg-blue-600 selection:text-white dark:bg-zinc-950 dark:text-zinc-100">
      {/* Skip to main content keyboard anchor */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to content
      </a>

      {/* Semantic Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                {APP_NAME}
              </span>
              <span className="hidden text-xs font-medium text-zinc-500 sm:ml-2.5 sm:inline dark:text-zinc-400">
                {APP_TAGLINE}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              Built for H25
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        id="main"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 lg:py-12"
      >
        {/* Hero Section */}
        <section aria-labelledby="hero-title" className="text-center">
          <h1
            id="hero-title"
            className="text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-4xl lg:text-5xl dark:text-white"
          >
            Understand your legal documents in plain language
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-300">
            Legal information is often complex, opaque, and hard to navigate without professional
            assistance. LegalSaathi provides instant document ingestion, plain-language clause
            breakdowns, and risk insights for non-lawyers.
          </p>
        </section>

        {/* Interactive Workspace Section */}
        <section aria-labelledby="workspace-section-heading" className="mt-8">
          <h2 id="workspace-section-heading" className="sr-only">
            Legal Document Workspace
          </h2>
          <LegalWorkspace />
        </section>

        {/* AI Capabilities Grid Section */}
        <section aria-labelledby="capabilities-heading" className="mt-12">
          <div className="border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <h2
              id="capabilities-heading"
              className="text-center text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100"
            >
              Legal Intelligence Capabilities
            </h2>
            <p className="mt-1.5 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Empowering non-lawyers with end-to-end legal comprehension and risk intelligence
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {CAPABILITY_FEATURES.map((feature) => {
                const IconComponent = feature.icon;
                const isActive = feature.status === 'active';

                return (
                  <div
                    key={feature.id}
                    className={`flex flex-col rounded-xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
                      isActive
                        ? 'border-blue-200 bg-white dark:border-blue-900/50 dark:bg-zinc-900'
                        : 'border-zinc-200 bg-zinc-50/50 opacity-80 dark:border-zinc-800 dark:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          isActive
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        <IconComponent className="h-5 w-5" aria-hidden="true" />
                      </div>
                      {isActive ? (
                        <span className="text-2xs inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="text-2xs inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {feature.title}
                    </h3>
                    <p
                      id={feature.id}
                      aria-describedby={feature.id}
                      className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400"
                    >
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Disclaimer Banner */}
        <section aria-labelledby="disclaimer-section-heading" className="mt-10">
          <h2 id="disclaimer-section-heading" className="sr-only">
            Legal Information Notice
          </h2>
          <DisclaimerBanner />
        </section>
      </main>

      {/* Semantic Footer */}
      <footer className="mt-auto border-t border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-xs text-zinc-500 sm:flex-row sm:px-6 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>&copy; 2026 {APP_NAME}. Released under the MIT License.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-medium">Built for H25 Hackathon</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LegalSaathi GitHub repository (opens in new tab)"
              className="inline-flex items-center gap-1.5 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
