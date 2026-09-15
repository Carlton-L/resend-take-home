// src/lib/hooks/useMenu.ts
'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

type Menu = {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
};

/**
 * A dropdown that does not depend on the popover attribute.
 *
 * The popover API was tried first and dropped: the panel needs a display that survives the closed
 * state, and Tailwind has no `popover-open` variant, so the utility that was meant to show it
 * compiled to nothing and the menu never opened on any browser. This is the hand-built version the
 * project would have reached for anyway, since there is no component library.
 *
 * It closes on a click outside the trigger and the menu, on Escape, and on focus leaving both. On
 * Escape it returns focus to the trigger. Opened from the keyboard it focuses the first item, and
 * the arrow keys, Home and End move between items, which is what a `menu` role promises.
 * Everything is a plain listener, so it behaves the same in every browser.
 */
export const useMenu = (): Menu => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (triggerRef.current?.contains(target) === true || menuRef.current?.contains(target) === true);

    const onPointerDown = (event: PointerEvent) => {
      if (!inside(event.target)) {
        setOpen(false);
      }
    };
    // The items, in order. A menu that announces itself as one owes the arrow keys.
    const items = (): HTMLElement[] =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href], button') ?? []);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (!inside(event.target)) {
        return;
      }
      const list = items();
      if (list.length === 0) {
        return;
      }
      const at = list.indexOf(document.activeElement as HTMLElement);
      let next: number | null = null;
      if (event.key === 'ArrowDown') {
        next = at < 0 || at === list.length - 1 ? 0 : at + 1;
      } else if (event.key === 'ArrowUp') {
        next = at <= 0 ? list.length - 1 : at - 1;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = list.length - 1;
      }
      if (next !== null) {
        event.preventDefault();
        list[next]?.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!inside(event.target)) {
        setOpen(false);
      }
    };

    // Opened from the keyboard, focus lands on the first item. Opened with a pointer it stays on
    // the trigger, so a click does not move the page.
    if (triggerRef.current?.matches(':focus-visible')) {
      items()[0]?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  return { open, triggerRef, menuRef, toggle, close };
};
