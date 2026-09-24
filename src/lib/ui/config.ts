// src/lib/ui/config.ts

/**
 * The hover sidebar of claims. Off, the domain name in the breadcrumb opens a picker instead.
 * Phones and touch screens always get the picker.
 *
 * A code constant, not an environment flag. The project adopts no feature flags, and this is a
 * design choice made at build time rather than a release switch.
 */
export const SIDEBAR = true;
