// src/lib/copy/app.ts

/**
 * The two screens that are not part of any flow. Kept beside the copy rules rather than inside a
 * feature, because they can be reached from anywhere.
 */
export const appCopy = {
  notFound: {
    title: 'Nothing at this address',
    description:
      'No page matches it. A claim also reads this way when it belongs to a different account, since telling a stranger that an id exists is an answer they have no use for.',
    action: 'Back to the start',
  },
  unexpected: {
    title: 'This page stopped early',
    description: 'Something failed while the page was being built and it did not finish.',
    action: 'Try again',
  },
} as const;
