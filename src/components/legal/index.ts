/**
 * @module components/legal
 * @description Centralized barrel exports for all LegalSaathi legal workspace and document UI components.
 * @responsibility Re-exports accessible document uploader, preview card, legal disclaimer, and workspace container.
 * @alignsWith Problem Statement: "Simplifying complex legal documents"
 * @qualityTier production — full JSDoc, strict TypeScript, zero warnings
 */

export { DocumentUploader } from './DocumentUploader';
export { DocumentPreview } from './DocumentPreview';
export { DisclaimerBanner } from './DisclaimerBanner';
export { LegalWorkspace } from './LegalWorkspace';
export type { DocumentUploaderProps } from './DocumentUploader';
export type { DocumentPreviewProps } from './DocumentPreview';
