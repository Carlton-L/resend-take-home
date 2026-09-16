// src/lib/copy/app.ts

/**
 * The two screens that are not part of any flow. Kept beside the copy rules rather than inside a
 * feature, because they can be reached from anywhere.
 */
export const appCopy = {
  /** The skip link, first in the tab order on every page. */
  skipToContent: 'Skip to content',
  notFound: {
    title: 'Page not found',
    description: 'No page exists at this address.',
    note: 'A claim that belongs to another account also shows this page.',
    action: 'Back to the start',
  },
  /** The claim form and the record screen, when the page fails before the claim is read. */
  claimFailed: {
    title: 'This claim could not be loaded',
    description: 'The page failed before the claim was read. Nothing about the claim has changed.',
    action: 'Try again',
  },
  unexpected: {
    title: 'Something went wrong',
    description: 'The page could not be loaded.',
    action: 'Try again',
  },
} as const;
