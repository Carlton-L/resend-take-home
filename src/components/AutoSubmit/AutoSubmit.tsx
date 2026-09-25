// src/components/AutoSubmit/AutoSubmit.tsx
'use client';

import type React from 'react';
import { useEffect } from 'react';

/**
 * Submits a form once, as soon as the page has loaded in a browser that runs scripts.
 *
 * The sign in link lands on a page that redeems nothing on its own. Link scanners that fetch the
 * page without running scripts stop there, so the single use token survives for the person. A
 * person's browser runs this and signs in with no click. With scripts off, the form's own button is
 * still there.
 */
const AutoSubmit: React.FC<{ formId: string }> = ({ formId }) => {
  useEffect(() => {
    const form = document.getElementById(formId);
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  }, [formId]);
  return null;
};

export default AutoSubmit;
