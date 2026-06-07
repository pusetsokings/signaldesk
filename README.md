# SignalDesk

SignalDesk is the signal harvesting engine for the Brandlytics ecosystem.

It runs at `signal.brandlytics.agency` and feeds qualified opportunities into
`crm.brandlytics.agency`.

## Core Promise

Find people already asking for what you sell.

This line is also the core SignalDesk tag.

SignalDesk watches public online conversations, detects demand signals, matches
them to products or services, drafts the next best response, and pushes qualified
leads into Brandlytics CRM.

## MVP Shape

- Hosted dashboard on Vercel
- GitHub repository as source of truth
- Agent-run signal scans on demand or on schedule
- Database-backed opportunity inbox
- Brandlytics CRM push integration

## First MVP Modules

- Products / Services
- Signals
- Opportunities
- Responses
- Leads
- Campaigns
- Analytics
- Settings

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Brand Guide

See [docs/BRAND_GUIDE.md](docs/BRAND_GUIDE.md). The current SignalDesk radar
mark is preserved while the broader interface follows the clean white,
near-black, emerald-primary system described in the guide.

## Agent Protocol

See [docs/SIGNALDESK_AGENT_PROTOCOL.md](docs/SIGNALDESK_AGENT_PROTOCOL.md).

## Local Development

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```
