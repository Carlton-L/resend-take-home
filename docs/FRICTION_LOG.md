# Friction log

Every moment of confusion or friction hit while using DomainClaim. Each entry is resolved, accepted
or deferred. Observations come from using the app, not from reading the code.

## 2026-09-12, claim entry screen, local dev

First session with a screen to use. The screen normalizes a typed domain and reports what it
changed, or why it refused. Nine entries.

### Pasting an email address claimed the provider's domain

Typed `carlton@protonmail.com`. The screen returned `protonmail.com` as the name to claim, with one
line saying the sign in details before the `@` had been removed.

Resolved in #2. This is the silent rewrite the product is built to argue against, and the most
likely paste of anything found in this session. An `@` now means credentials only when a scheme is
present, or when the local part holds a colon that an unquoted local part cannot contain. Otherwise
the input is refused and the domain part is offered as a control.

### A made-up ending was accepted as a real domain

Typed `192.0.2.carlton`. The screen accepted it and said "Subdomain of `2.carlton`", which is not a
sentence anyone should be shown.

Resolved in #2. The Public Suffix List carries an implicit `*` rule, so an unrecognised last label
parses as a valid suffix with one name under it. The check is now `isIcann || isPrivate`.

### A dev server URL was told to add an ending

Typed `http://localhost:3000/claim`. The refusal quoted the whole URL back and said it had only one
part, which contradicted what was still visible in the field.

Resolved in #2. Two causes. Failures were carrying the raw paste rather than the value the input had
been reduced to, and `localhost` had no message of its own. Special-use names are now refused by
name, and every failure after reduction carries what we read.

### Following the advice produced a second error

Typed `.com`. The refusal said to remove the extra dot. Removing it gives `com`, which is refused
again for a different reason.

Resolved in #2. A leading dot and an interior double dot are the same defect to a parser and
different mistakes to a person, so they are separate codes with different next actions.

### A failure showed the broken fragment on its own

Typed `example.-example.com`. The refusal displayed `-example` alone, leaving the work of finding it
in the original to the reader.

Resolved in #2. Single-label failures carry the whole name and the index of the section at fault,
and the interface shows the name with that section marked.

### Only one problem was reported when there were two

Typed `example..-example.com`. The refusal named the dots and said nothing about the hyphen.

Accepted. The checks are a pipeline where each stage depends on the one before it, so only the four
per-label checks could be collected, and a list that looked complete while being partial would be
worse than one error. Reporting several at once also breaks the rule that every failure names
exactly one next action, and every DNS failure in the product is singular by nature. The mitigation
is the entry above: showing the whole name with the section marked means a second problem is visible
even though only one is named. Reasoning recorded in `docs/RFC.md` and `spec.md`.

### The suggested repair assumes the likelier mistake

Typed `example..com`. The refusal says to remove the extra dot. A user who meant to type
`example.example.com` and dropped a whole section would be told the wrong thing.

Accepted. An extra dot is far more likely than an omitted label, and naming the second possibility
would break the one-action rule to serve a case that barely happens.

### The change list explains what changed and not why

Pasting `https://WWW.Example.com/pricing?ref=hn` lists the scheme, path and case as three separate
changes. The list reads clearly, but none of the entries say why the change was needed.

Deferred. Only the punycode entry carries an explanation, because it is the only one where the
result is unreadable without it. The structure for the rest already exists as the unused `detail`
field. Hover was considered and rejected in the same breath: there is no touch equivalent, and a
tooltip means hand-building a popover with focus management in a project with no component library.
Inline second lines or a per-entry disclosure are the shapes to try.

### Claiming www raised a question the screen did not answer

The result for `www.example.com` said it is claimed separately from `example.com`, which prompted
the question of what happens if two accounts hold one each.

Resolved in #2, in part. Placing a record at `_domainclaim-challenge.www.example.com` requires write
access to the `example.com` zone unless the subdomain is separately delegated, so a second claimant
gains nothing they did not already have. The risk is that the two names read alike to a person,
which is handled by always showing the full name. `www` is now offered as a suggestion pointing at
the name above it, never applied. Claiming both in one action is open.

## 2026-09-13, magic link sign in, local dev

First session with sign in. Three entries.

### A dead link showed an error while I was already signed in

Opened the same link twice. The second time, the page said the link no longer works, with the
header above it showing the account signed in. Both things were true and the screen was still
wrong: the thing I asked for had happened.

Resolved in #4. A spent token in a browser already holding a session for that address now lands on
the destination instead of the dead link page, and the confirmation page skips its button entirely
when the session already matches. A dead link only reports a dead link when the person is not
already where the link was taking them.

### The dead link page explained a cause that was not mine

The copy said links expire after fifteen minutes and that email providers open links to check them.
Neither had happened. I had asked for a second link, which killed the first, and then opened the
first. The scanner sentence also gave me nothing to do about it, and it describes a problem this
product already solved by redeeming on POST.

Resolved in #4. Supabase returns the same error for expired, used and replaced, so naming one cause
means guessing. The page now states the three rules that make links stop working, including that a
new link replaces the last, and ends with the one action.

### Buttons did not look clickable

No pointer cursor on any button, including "Use a different address" on the check your email
screen.

Resolved in #4. Tailwind 4 gives buttons the default arrow cursor. One base rule in `globals.css`
restores the pointer for every enabled button, and leaves disabled ones alone.
