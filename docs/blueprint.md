# AI Visual Director — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A collaborative AI image generation/editing bot that produces ultra-high-quality HD–4K images from text or uploaded images. Preserves user intent and visual continuity while offering professional-grade tools for creators, marketers, and designers.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- general public
- content creators
- marketers
- designers
- hobbyists

## Success criteria

- Generate HD/4K images from text/images with download links
- Maintain visual consistency across edits
- Provide professional prompt suggestions
- Handle clarifying questions efficiently
- Deliver images inline while preserving chat usability

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with available actions
- **/new** (command, actor: user, command: /new) — Start new image generation from text prompt
- **/edit** (command, actor: user, command: /edit) — Upload image for editing with instructions
- **Upscale to 4K** (button, actor: user, callback: upscale:request) — Request 4K resolution for last generated image
  - inputs: image_id
  - outputs: high_res_image_url
- **Pin Character** (button, actor: user, callback: character:pin) — Save character attributes for reuse
  - inputs: character_attributes
  - outputs: confirmation_message

## Flows

### Image Generation
_Trigger:_ /new or text prompt

1. Analyze request
2. Ask clarifying questions (max 2)
3. Generate improved prompt
4. Render HD image inline
5. Provide download link and professional prompt

_Data touched:_ Prompt, Asset, Session

### Image Editing
_Trigger:_ /edit or image upload

1. Receive image and instructions
2. Identify missing critical details
3. Preserve unchanged attributes
4. Generate edited image
5. Show alternatives with consent

_Data touched:_ Asset, Job, Session

### Clarification Handling
_Trigger:_ Incomplete request

1. Identify missing load-bearing details
2. Ask concise follow-up questions
3. Update internal prompt

_Data touched:_ Prompt, Session

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with session history
  - fields: telegram_id, session_memory, pinned_characters
- **Job** _(retention: persistent)_ — Image generation/edit task
  - fields: job_id, status, assets, prompts
- **Asset** _(retention: persistent)_ — Generated/uploaded image
  - fields: image_id, thumbnail_url, full_res_url
- **Prompt** _(retention: session)_ — User and AI-generated prompts
  - fields: original_text, professional_prompt, character_attributes

## Integrations

- **Telegram** (required) — Bot API messaging and file delivery
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Manage job history retention
- Configure character persistence rules
- Adjust session memory duration

## Notifications

- Job completion alerts with inline images
- Progress updates during long tasks
- Safety warnings for borderline content

## Permissions & privacy

- Store session memory for 7 days by default
- Keep only thumbnails in history view
- Require explicit consent for character persistence

## Edge cases

- Missing critical details in prompts
- Conflicting edit instructions
- Borderline content requests
- Large file uploads exceeding Telegram limits

## Required tests

- End-to-end image generation flow with clarifications
- Edit flow preserving attributes
- 4K upscale delivery
- Session persistence across messages

## Assumptions

- Using OpenAI for prompt refinement
- Storage solution for assets and metadata
- Default 5-image session memory
