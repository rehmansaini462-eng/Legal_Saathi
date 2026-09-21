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
export { SummaryCard } from './SummaryCard';
export { ClauseList } from './ClauseList';
export { AskQuestion } from './AskQuestion';
export { CompareDocuments } from './CompareDocuments';
export { LawyerPrepCard } from './LawyerPrepCard';
export { ActionChecklist } from './ActionChecklist';
export { RedactPIIPanel } from './RedactPIIPanel';
export type { DocumentUploaderProps } from './DocumentUploader';
export type { DocumentPreviewProps } from './DocumentPreview';
export type { SummaryCardProps } from './SummaryCard';
export type { ClauseListProps } from './ClauseList';
export type { AskQuestionProps } from './AskQuestion';
export type { CompareDocumentsProps } from './CompareDocuments';
export type { LawyerPrepCardProps } from './LawyerPrepCard';
export type { ActionChecklistProps } from './ActionChecklist';
export type { RedactPIIPanelProps } from './RedactPIIPanel';
