# Roadmap

Pa-Varaq is a free, open-source book lending platform for friends, campuses and local communities. This roadmap says where the project is going and how to pick work. It is a plan, not a promise: the maintainer may reorder things as the community grows.

## Where we are

Working today: global discovery, personal library with ISBN scanning, identity verification, the loan flow with the 4-digit PIN handshake, karma tokens, the Book Passport, wishlist and circles. See the [README](README.md).

Biggest gaps: automated tests beyond a few unit tests, real SMS delivery, a deployment guide, notifications, and an accessibility pass.

## Milestones

Work is grouped into three milestones. Each issue belongs to one, and the board shows them in order.

### v0.2 Foundation

Goal: make it safe for many people to contribute. Linting, integration and end-to-end tests, hardened containers, global rate limiting and log redaction.

Open issues: [milestone v0.2](https://github.com/mahanmntz/pa-varaq/milestone/1)

### v0.3 Launch-ready

Goal: a real community can use it. SMS login codes, a production deployment guide, an accessibility pass, a Jalali date picker and a Persian README.

Open issues: [milestone v0.3](https://github.com/mahanmntz/pa-varaq/milestone/2)

### v0.4 Engagement

Goal: bring people back. In-app notifications first, then push notifications and reminders.

Open issues: [milestone v0.4](https://github.com/mahanmntz/pa-varaq/milestone/3)

## How to pick work

1. Open the issue board, or filter issues by the [`status:ready`](https://github.com/mahanmntz/pa-varaq/labels/status%3Aready) label.
2. New to the project? Start with [`good first issue`](https://github.com/mahanmntz/pa-varaq/labels/good%20first%20issue).
3. Comment "I'll take this" and wait until the maintainer assigns the issue to you.
4. Issues labelled `needs-triage` are not ready yet. You can discuss them, but please do not start coding.
5. Have an idea that is not here? Open a feature request first. Ideas that fit the project's rules (simple, low-friction, private by default) are added to the board.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## Principles

These rules decide what fits and what does not:

- Simple and low-friction beats clever.
- Privacy first: no photo uploads, no exact locations, no raw phone numbers stored, no private identity fields shown to other users.
- The product is Persian and right-to-left; code, comments, docs and commits are English.
- Free for everyone: no paywalls and no commercial middlemen.
