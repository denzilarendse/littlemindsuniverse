# LittleMinds Connect — canonical communication architecture

Status: implementation foundation, 26 September 2026.

## Decision
LittleMindsUniverse communication is owned by LittleMinds Connect. WhatsApp is removed as a launch dependency. Existing historical WhatsApp migrations remain immutable history, but no new product flow, secret, endpoint or release gate may depend on WhatsApp.

LittleMinds Connect has two surfaces over one authorization model:

1. **LMU embedded messaging** — learner/teacher/guardian/admin communication inside LittleMindsUniverse.
2. **LittleMinds Connect standalone** — web/PWA first, then Android/iOS and Windows packaging over the same backend.

A future **Connect Business** tier adds verified organizations, multi-agent inboxes, broadcasts, templates, automations, analytics and API/webhook integration without creating a second messaging backend.

## Safety invariants

- Relationship authorization, not username discovery, determines who can communicate.
- Learner accounts are notification-only until an age/guardian/teacher policy explicitly enables a governed interaction mode.
- No unrestricted adult-to-child direct messaging.
- No public learner directory or public learner profile.
- Every message is scoped to a conversation membership graph and protected by RLS.
- Message attachments use private storage only.
- Server/service credentials never ship to clients.
- Delivery/read state is auditable.
- Moderation/reporting and retention/deletion controls are first-class capabilities.
- Academic authority remains with teachers; Milo may draft or summarize but may not silently act as the teacher.

## Core data model

- `connect_conversations`
- `connect_members`
- `connect_messages`
- `connect_receipts`
- `connect_business_accounts`
- `connect_business_members`

Later phases add reactions, attachments, reports, blocks, push tokens, broadcast channels, business templates, inbox assignment, webhooks and audit events.

## Authorization model

Conversation membership is necessary but not sufficient for sending. Read access requires membership. Send access additionally requires an allowed role and a non-suspended member state. Learners remain read-only in the first release foundation.

Direct client writes to the conversation/member graph are not granted. Membership-changing operations must go through reviewed RPC/server paths that verify existing classroom, guardian or organization relationships.

## Product sequence

1. Establish schema/RLS/RPC foundation.
2. Migrate current LMU message UI from legacy RPC names to Connect RPCs through a compatibility layer.
3. Remove WhatsApp endpoint, Netlify adapter, provider environment variables and WhatsApp-specific tests/UI.
4. Add receipts/unread state, realtime subscriptions and offline-safe optimistic UI.
5. Add private attachments, reporting/moderation and push notification registration.
6. Add Connect Business organization/inbox primitives.
7. Run full role/RLS/browser/mobile regression.
8. Package the same web client for Android/iOS/Windows after production web gates are green.

## Release evidence rule
A Connect gate is PASS only after the relevant command, database authorization test or hosted runtime flow is observed. Tests and RLS/security rules are not weakened to manufacture green results.
