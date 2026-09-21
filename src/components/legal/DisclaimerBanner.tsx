/**
 * @module components/legal/DisclaimerBanner
 * @description Mandatory legal informational notice banner for LegalSaathi.
 * Displays explicit notice clarifying that the platform provides informational assistance rather than certified legal representation.
 * @responsibility Renders the system-wide legal disclaimer to meet compliance and ethical AI requirements.
 * @alignsWith Problem Statement: "Solutions should provide information and assistance, rather than replace professional legal advice"
 * @accessibility Fully WCAG 2.1 AA compliant with explicit aria-label and accessible color contrast.
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { DISCLAIMER_TEXT } from '@/config/constants';

/**
 * Client component rendering a soft amber legal disclaimer banner.
 *
 * @returns Accessible legal disclaimer banner element.
 * @example
 *   <DisclaimerBanner />
 */
export function DisclaimerBanner(): React.JSX.Element {
  return (
    <aside
      aria-label="Legal disclaimer"
      className="w-full rounded-xl border border-amber-300/80 bg-amber-50/90 p-4 text-amber-950 shadow-xs dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="flex-1 text-xs leading-relaxed sm:text-sm">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            Legal Notice &amp; Ethical AI Disclaimer
          </p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300">{DISCLAIMER_TEXT}</p>
        </div>
      </div>
    </aside>
  );
}
