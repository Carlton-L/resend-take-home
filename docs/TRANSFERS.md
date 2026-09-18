# Transfers

Type: new feature. Status: draft, designed and not built. Feature RFC in the same section order as
the main [RFC](RFC.md) and Resend's template.

Contents: [Purpose](#purpose) · [Background](#background) · [Proposal](#proposal) ·
[Technical Details](#technical-details) · [Implementation Plan](#implementation-plan) ·
[Decisions](#decisions) · [Open Questions](#open-questions) · [Prototype](#prototype)

## Purpose

Move a held name from one account to another safely, so a sold, migrated or abandoned domain can
change hands without a name ever leaving an account silently.

Today the product lets a second account create a claim on a name someone else holds, and lets that
account prove control of it. When the proof lands, the challenger is told the name is held and their
claim stays pending. Nothing reaches the incumbent and nothing moves. This document says what should
happen instead, and why the safe version is a notice period rather than an instant move or an
approval that needs both parties alive.

Status: design. No writer ships with it. The `contested` status exists in the enum and the schema,
its `challengerProvedAt` and `decisionDueAt` fields are designed here and not stored yet; the
partial unique index already reserves the
name to one holder across the holding states. This is the reader those were shaped for. It depends
on the same scheduled job the grace window needs, which is not built either, for the reason in the
main [RFC](RFC.md).

## Background

### The problem

Two accounts can each have a real claim on one name across time. The first proved control once and
may still hold it. The second controls the zone now and can prove it. Control of DNS is the only
ground truth the product has, and three different stories leave the same evidence behind:

| Story | What happened | What the product sees |
| --- | --- | --- |
| Handover | The name was sold or the project moved. The new account controls the zone, the old one has walked away. | A second account placed a valid token. |
| Attack | Someone took the zone. They control it now and the real owner is about to find out. | A second account placed a valid token. |
| Abandonment | The old account is gone and unreachable. The new controller cannot ask it for anything. | A second account placed a valid token. |

From one vantage point, at one moment, these read alike. The product cannot tell them apart, and a
design that pretends it can is the thing to avoid.

### What the product can and cannot know

- Proving control means placing a token in the zone, which needs write access to the zone now. So a
  fresh proof is the strongest signal the product has about who holds the name today, and the
  incumbent's earlier proof is stale by comparison.
- Both tokens can sit at `_domainclaim-challenge.<name>` at once, since TXT holds many values. So
  the challenger proving control does not by itself remove the incumbent's proof. Whoever has full
  control can delete the other's token; two parties sharing access can each keep one alive.
- One vantage point cannot separate an attacker who took the zone from an owner who handed it over.
  Both hold the zone now. This is the same weakness the check has everywhere, stated in the RFC.
- The one channel that survives losing the zone is the address on the account. An incumbent who has
  lost the zone cannot be reached through it, and can still be reached by email.

## Proposal

### Guarantees

The design turns on four, in order of how much they matter.

1. The incumbent is always told, out of band. A second account proving control sends an email to the
   address on the incumbent's account, every time, before anything moves. Losing a name should never
   be something a person finds out by opening the app on their own.
2. Nothing moves silently. A held name only leaves an account through a state the incumbent was
   shown and given a window to answer. No path hands a name over on the strength of one check.
3. Resolution is bounded. A contest ends in a set time whether or not the incumbent answers, so a
   name is never parked forever waiting on someone who has gone. This is what frees the new
   controller of a sold or abandoned name.
4. A stale proof never outranks a current one on its own. The incumbent keeps the name through the
   window, and past that the account that can prove control now is the one that holds it.

### The flow

1. A second account holds a pending claim on a held name. Already allowed today: uniqueness covers
   the holding states, so any number of accounts may hold a pending attempt on the same name.
2. The challenger's check finds their token. Instead of staying pending with a notice, the proof
   opens a contest.
3. The incumbent's row moves `verified` to `contested`, stamped `challengerProvedAt = now` and
   `decisionDueAt = now + window`. The incumbent still holds the name for the length of the window.
   The challenger's claim stays pending and is linked to the contest.
4. The incumbent is alerted: an email to the address on the account, and a persistent notice in the
   app on the list and the record screen. Both name the domain, say control was proved elsewhere,
   and give the date the window closes and the one action that holds the name.
5. The contest ends on the first of three things:
   - The incumbent reasserts control before the date. A check finds the incumbent's own token still
     answering. The claim returns to `verified`, the stamps clear, the challenge is marked declined,
     and the challenger is told the name stayed with its holder.
   - The incumbent approves the transfer. The name moves at once. This is the handover made
     explicit, for a seller who wants it done rather than waited out.
   - The window closes with no answer. Control moves to the challenger. This is what resolves the
     sold and abandoned cases, where the incumbent will never answer because it cannot.
6. On a move, one statement flips the holder inside a transaction: the incumbent's row leaves the
   holding set for `revoked`, the challenger's pending row enters it as `verified` with a fresh
   `verified_at`. The order matters so the unique index is never violated mid-move.

### The three cases, resolved

| Case | Incumbent's zone | How it ends | Why it is right |
| --- | --- | --- | --- |
| Handover | Lost, on purpose | Approve, or the window closes and it moves | The new controller gets the name, the old one was told and did not object |
| Attack | Lost, against their will | The window closes and it moves, after the email warned them | The zone is already gone; the product cannot hold a name the attacker controls, and the email is the real recourse |
| Abandonment | Gone, no owner to ask | The window closes and it moves | No deadlock: the new controller is not stuck waiting on an account that will never answer |

The attack case is the uncomfortable one, and the honest reading is that the product cannot save a
name whose zone has already been taken. What it can do is make sure the owner hears about it through
a channel the attacker does not control, and never pretend the takeover was orderly.

## Implementation Plan

Four slices, each one pull request, in the order that keeps every intermediate state safe.

1. The `transfers` table and the contest writer: the challenger's proof moves the incumbent's row
   to `contested` and writes the contest row. Nothing else changes yet, so the only visible effect
   is the incumbent's pill.
2. The notices: the email to the incumbent through Resend, the persistent notice on the list and the
   record screen, and the challenger's own line. Reachable in the demo by seeding a contest.
3. Reassert and approve: the incumbent's check clears the contest when their token still answers,
   and the approve action moves the name at once in one transaction.
4. The window closing: the scheduled job that resolves a contest at `decision_due_at`. Needs the
   same cron as the grace window, so it lands with a paid plan or a protected manual trigger.

## Technical Details

### State and data

The status exists. The fields are the design:

```ts
type ClaimState =
  // ...
  | { status: 'contested'; verifiedAt: Date; challengerProvedAt: Date; decisionDueAt: Date };
```

`contested` is a holding state: it sits inside the partial unique index with `verified` and
`at_risk`, so the name stays reserved to the incumbent for the length of the contest and a third
account cannot take it out from under both.

One table records the contest, `transfers`, designed here and not built:

- `id`
- `name`, normalized, the same value the index keys on
- `incumbent_claim_id`, the row that holds the name
- `challenger_claim_id`, the pending row that proved control
- `challenger_proved_at`
- `decision_due_at`
- `resolution`, one of `held`, `approved`, `timed_out`, still open while null
- `resolved_at`

The row is written when the challenger's proof lands, read by the scheduled job that closes the
window, and by the record and list screens showing the notice. It carries both claim ids so a move
is one statement against known rows rather than a lookup by name at the moment it matters.

### Notification design

- The email names the domain, says control of it was proved from another account, gives the date the
  window closes, and links to the record screen where the incumbent can reassert or approve. It does
  not name the challenging account, which the incumbent has no way to verify and no need to see.
- The in-app notice sits above the list and at the top of the record screen, in the attention tone,
  and stays until the contest ends. It carries the same date and the same one action.
- The challenger's own screen says the name is held and a decision is due, with the same date. It
  does not claim the name is theirs while the window is open, since it is not.
- When the contest ends, the side that lost is told plainly: the incumbent that the name has moved,
  or the challenger that it stayed with its holder.

## Decisions

- A notice period rather than an instant move. Instant-on-proof is simpler and matches the fact that
  control moved, but it gives the incumbent no window to answer before the name leaves, and the one
  case where a window helps is a shared or contested zone where the incumbent still has their token.
  The window costs the challenger a wait and buys the incumbent the chance to hold.
- A notice period rather than an approval both parties must be alive for. Requiring the incumbent to
  approve every move reads as safe and creates the deadlock: a sold or abandoned name waits forever
  on an account that will never answer, and the new controller has no way to reach it. The timeout
  is the same protection without the lock.
- Reassert means the incumbent's own token still answers on a fresh check. It is the same proof the
  claim was built on, asked again. An incumbent who still controls the zone holds the name by doing
  nothing to their DNS; one who has lost it cannot reassert, which is the correct outcome and the
  point at which the email is all the product can offer.
- Email is the channel that decides. The in-app notice is for an incumbent who happens to open the
  app; the email reaches one who does not, and survives the incumbent losing the zone, which the app
  session does not. The status-change email in the main RFC is the same sender and path.
- The notice persists until the contest ends. It is not dismissable, since a dismissed warning about
  losing a name is the same silence the whole product is written against. It clears when the
  incumbent reasserts, approves, or the window closes.
- The window is stated as a real date, and is demoable in minutes. Like the grace window, a
  fourteen-day default is right for a person and useless in a review, so the length is configuration
  and the screen shows the date rather than a duration.
- One challenger at a time, modelled. `contested` carries one `challengerProvedAt` and one
  `decisionDueAt`, so it holds one challenger. A second account proving control during a contest is
  an open question below rather than a second set of fields.
- A contest is not free to start, so it needs no separate abuse gate yet. Creating a claim costs
  only typing a name, but opening a contest costs proving control, which needs write access to the
  zone. A griefer with brief access is the real risk, answered by the incumbent reasserting, and
  rate limits on contests per name are noted below rather than specified here.

## Open Questions

- Who decides in the end: the incumbent, a timer, or proving control winning after a notice period.
  This RFC takes the last, since it is the only one that clears the abandoned case. Atlassian and
  Google both keep the incumbent until a person acts, which is defensible for a product that can ask
  a human and wrong for one that cannot reach the owner at all.
- The window length. Atlassian uses fourteen days. It has to be minutes in a demo, so it is
  configuration, but the default is a real policy question and depends on how the email lands.
- How reassert is defined when both tokens are present. An incumbent sharing zone access with the
  challenger can reassert forever and block a genuine sale. Then the answer is approval or letting
  the window close on purpose, and the product cannot tell that apart from an attack it should
  resist. This is the residual ambiguity the one vantage point cannot remove.
- Two challengers proving control of one name at once. `contested` models one. A queue, or
  first-proof-wins with the second told the name is already in contest, are both plausible.
- Rate limits on contests per name, so brief zone access cannot be used to force the incumbent to
  reassert on a schedule.
- Whether the incumbent who loses a name keeps a record of the contest, or only the email. Nothing
  reads a closed `transfers` row today beyond the resolution.
- The dependency on the scheduled job. The window cannot close without something firing at
  `decision_due_at`, which is the same cron the grace window needs and the same reason neither is
  built. A protected manual trigger demos both.

## Prototype

The screens this describes are in [prototypes/transfers.html](prototypes/transfers.html): the
challenger's record screen during a contest, the incumbent's list with the persistent notice, the
email, the reassert action, and the lifecycle. It uses the app's own tokens and is a design
reference for this RFC. Nothing in it is built.
