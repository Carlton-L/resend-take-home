// src/lib/domain/messages.ts
import type { DomainInputError, NormalizationChange } from '@/lib/domain/normalize';

/**
 * What the failure is about, in a form the interface can render.
 *
 * `marked_name` carries the whole name plus the index of the section at fault, so a failure at one
 * label shows the name the user is looking at with that part picked out, rather than the fragment
 * on its own.
 */
export type ErrorSubject =
  | { kind: 'text'; value: string }
  | { kind: 'marked_name'; name: string; labelIndex: number };

/**
 * A failure the user can act on. Same four parts as the DNS failure messages: what went wrong, the
 * value it went wrong on, why, and the one thing to do next.
 */
export type DomainErrorMessage = {
  title: string;
  subject: ErrorSubject | null;
  description: string;
  /** Exactly one next action. */
  action: string;
  /** A name the user probably meant, offered as a control. Null when there is nothing to offer. */
  suggestion: string | null;
};

/** One entry in the change list, describing a transformation in words the user can check. */
export type ChangeDescription = {
  summary: string;
  /** The value the change acted on. Rendered as code. */
  value: string | null;
  /** One line of explanation, present only where the summary alone leaves the user guessing. */
  detail: string | null;
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

const text = (value: string): ErrorSubject => ({ kind: 'text', value });

export const describeDomainInputError = (error: DomainInputError): DomainErrorMessage => {
  switch (error.code) {
    case 'empty':
      return {
        title: 'Enter a domain',
        subject: null,
        description: 'The field is empty, so there is nothing to check.',
        action: 'Type the domain you want to claim, for example example.com.',
        suggestion: null,
      };
    case 'input_too_long':
      return {
        title: 'Input is too long',
        subject: text(`${error.length} characters`),
        description: `The field accepts up to ${error.max} characters. This is usually a paste of something larger than a domain.`,
        action: 'Paste just the domain.',
        suggestion: null,
      };
    case 'email_address':
      return {
        title: 'That looks like an email address',
        subject: text(error.input),
        description: `The domain part is ${error.domainPart}. Claiming it proves you control that whole domain, not the mailbox.`,
        action: `Enter ${error.domainPart} if that is the domain you control.`,
        suggestion: error.domainPart,
      };
    case 'unparseable':
      return {
        title: 'Could not read that as a domain',
        subject: text(error.name),
        description:
          'This did not match any domain shape, and none of the specific checks explain why.',
        action: 'Enter a name and an ending, for example example.com.',
        suggestion: null,
      };
    case 'is_ip_address':
      return {
        title: 'That is an IP address',
        subject: text(error.name),
        description:
          'Control is proved with a DNS record at a name. An address has no name to hold one.',
        action: 'Enter the domain that points at this address.',
        suggestion: null,
      };
    case 'leading_dot':
      return {
        title: 'The name is missing',
        subject: text(error.name),
        description: 'This starts with a dot, so the part before it is empty.',
        action: 'Add the name before the dot, for example example.com.',
        suggestion: null,
      };
    case 'double_dot':
      return {
        title: 'Two dots in a row',
        subject: text(error.name),
        description: 'Every section between dots needs at least one character.',
        action: 'Remove the extra dot.',
        suggestion: null,
      };
    case 'label_leading_hyphen':
      return {
        title: 'A section starts with a hyphen',
        subject: { kind: 'marked_name', name: error.name, labelIndex: error.labelIndex },
        description: 'Sections of a domain cannot start or end with a hyphen.',
        action: 'Remove the hyphen at the start of the marked section.',
        suggestion: null,
      };
    case 'label_trailing_hyphen':
      return {
        title: 'A section ends with a hyphen',
        subject: { kind: 'marked_name', name: error.name, labelIndex: error.labelIndex },
        description: 'Sections of a domain cannot start or end with a hyphen.',
        action: 'Remove the hyphen at the end of the marked section.',
        suggestion: null,
      };
    case 'label_too_long':
      return {
        title: 'One section is too long',
        subject: { kind: 'marked_name', name: error.name, labelIndex: error.labelIndex },
        description: `Each section between dots is at most ${error.max} characters. The marked one is ${error.label.length}.`,
        action: 'Shorten the marked section.',
        suggestion: null,
      };
    case 'name_too_long':
      return {
        title: 'Domain is too long',
        subject: text(`${error.length} characters`),
        description: `A DNS name is at most ${error.max} characters.`,
        action: 'Check for a section that was pasted twice.',
        suggestion: null,
      };
    case 'special_use_name':
      return {
        title: `${error.suffix} is reserved`,
        subject: text(error.name),
        description: `${error.suffix} is reserved by the internet standards and never resolves in public DNS, so there is no zone to hold a record.`,
        action: 'Enter a domain you registered, for example example.com.',
        suggestion: null,
      };
    case 'single_label':
      return {
        title: 'That is not a full domain',
        subject: text(error.name),
        description:
          error.name === error.input
            ? 'A domain has a name and an ending, like .com or .co.uk. This has only one part.'
            : `We read ${error.name} out of that, which has no ending like .com or .co.uk.`,
        action: 'Enter the domain you want to claim, for example example.com.',
        suggestion: null,
      };
    case 'is_public_suffix':
      return {
        title: `Nobody can claim ${error.suffix}`,
        subject: text(error.name),
        description: `Domains are registered underneath ${error.suffix}, so it has no single owner. Yours is the name you registered plus that ending.`,
        action: `Enter your full domain, for example yourcompany.${error.suffix}.`,
        suggestion: null,
      };
    case 'unknown_suffix':
      return {
        title: `${error.suffix} is not a top-level domain`,
        subject: text(error.name),
        description: `No registry issues names ending in ${error.suffix}, so this domain cannot exist.`,
        action: 'Check the ending and enter the domain you registered.',
        suggestion: null,
      };
    default: {
      const unhandled: never = error;
      throw new Error(`Unhandled domain input error: ${JSON.stringify(unhandled)}`);
    }
  }
};

export const describeChange = (change: NormalizationChange): ChangeDescription => {
  switch (change.kind) {
    case 'trimmed':
      return { summary: 'Removed the spaces around it', value: null, detail: null };
    case 'removed_control_characters': {
      const noun = plural(change.count, 'line break or tab', 'line breaks or tabs');
      return { summary: `Removed ${change.count} ${noun}`, value: null, detail: null };
    }
    case 'lowercased':
      return { summary: 'Lowercased', value: change.from, detail: null };
    case 'removed_scheme':
      return { summary: 'Removed the scheme', value: change.removed, detail: null };
    case 'removed_path':
      return { summary: 'Removed the path', value: change.removed, detail: null };
    case 'removed_credentials':
      return { summary: 'Removed the sign in details before the @', value: null, detail: null };
    case 'removed_port':
      return { summary: 'Removed the port', value: change.removed, detail: null };
    case 'removed_trailing_dot':
      return { summary: 'Removed the dot at the end', value: null, detail: null };
    case 'converted_to_punycode':
      return {
        summary: 'Converted to the ASCII form DNS uses',
        value: change.from,
        detail:
          'DNS names are ASCII. A domain with other letters is written in a form called punycode, ' +
          'which is what your DNS provider will show.',
      };
    case 'normalized_by_parser':
      return {
        summary: 'Rewrote some characters to their standard form',
        value: change.from,
        detail: null,
      };
    default: {
      const unhandled: never = change;
      throw new Error(`Unhandled normalization change: ${JSON.stringify(unhandled)}`);
    }
  }
};
