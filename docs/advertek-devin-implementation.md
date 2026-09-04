You are the lead engineer responsible for implementing the Advertek.io website improvements defined in the attached document:

“Advertek Devin Implementation Brief”

# Website:
https://www.advertek.io/

# Objective:
Upgrade Advertek.io from a strong early-stage product site into a credible agentic-commerce infrastructure platform.

# The core positioning is:
Advertek is the production network for AI agents.

Advertek connects AI agents and software platforms to real-world commercial production through MCP, REST APIs, deterministic quoting, payment, production, and order tracking.

# Your responsibility:

Review the existing codebase first.

Understand the current:

• framework and architecture
• page structure
• components
• API routes
• CMS or content structure
• authentication
• demo implementation
• analytics
• SEO configuration
• deployment setup
• payment architecture
• MCP implementation
• production integrations

Then implement the attached brief.

Do not rebuild working infrastructure without a reason.

Preserve existing functionality unless the brief explicitly changes it.

# Priority order:

## P0

Complete all P0 items first.

These include:

• Remove the expired static quote timestamp
• Replace static expiry dates with dynamically generated valid timestamps where required
• Update homepage positioning
• Improve hero CTA hierarchy
• Strengthen the live demo experience
• Improve proof and credibility
• Remove or relocate internal engineering language from marketing pages
• Make technical claims match current production capabilities

Treat any misleading production claim as a release blocker.

x402

Implement x402-related site changes carefully.

Do not present x402 as live production functionality unless working backend support exists and has been tested.

Use three possible states:

LIVE

Use only when the complete x402 payment flow operates end to end.

BETA

Use when functional but limited to pilot users, test environments, networks, assets, or transaction limits.

COMING SOON

Use when functionality is not operational.

If backend x402 implementation does not exist:

• add architecture support where appropriate
• prepare interfaces and components
• prepare documentation placeholders
• mark functionality clearly as coming soon
• do not fake transactions
• do not fake payment confirmation
• do not display fabricated transaction hashes

## Target architecture:

The product story should communicate:

AI Agent
↓
MCP / REST
↓
Agent Rail
↓
Production specification
↓
Deterministic quote
↓
Authorization
↓
x402 or supported payment rail
↓
Production
↓
Tracking and status events

## Homepage:  

Implement the new hierarchy defined in the brief.

The hero should communicate:

ADVERTEK

The production network for AI agents.

Specify. Price. Pay. Produce. Deliver.

MCP + REST access to real commercial production.

# Primary CTA:    
Try Agent Rail

# Secondary CTA:
Developer Docs

If x402 is fully functional, the support line may reference x402.

If not, do not present x402 as active.

Homepage sections should follow this general order:

Hero

Live Agent Rail demo

Infrastructure proof

Production capabilities

Agent Rail workflow

Why Advertek

Developer integration

Case study or pilot proof

Production network vision

Final CTA

Demo

The demo should become one of the strongest sections of the site.

A visitor should understand the product without speaking to sales.

Show the full workflow:

Prompt

Example:
“Produce 5,000 personalized direct-mail postcards for distribution across 12 locations.”

Then display:

• interpreted requirements
• structured production specification
• validation
• deterministic pricing
• estimated timeline
• shipping assumptions
• payment requirement
• approval step
• production state
• tracking or webhook response

Where appropriate expose:

View JSON

View MCP Call

View API Request

View Payment Request

Do not simulate successful production as if it occurred in the real facility unless the experience clearly identifies the response as sandbox or demo data.

Conversion

Reduce friction.

# Primary business CTA:

Start Production Pilot

Initial form should request only:

• work email
• company
• what the user wants to produce
• expected monthly volume

Collect deeper qualification information after initial submission.

## Developer CTA:

Get API Access

Where appropriate, support sandbox API key generation.

## Developer experience

Improve developer onboarding.

Add or improve:

• MCP connection instructions
• REST quick start
• copy buttons
• API examples
• authentication documentation
• quote workflow
• order workflow
• webhook examples
• status model
• error handling
• sandbox behavior

Prepare structure for:

• TypeScript SDK
• Python SDK
• reference repository
• OpenAI agent integration
• Claude integration
• Cursor integration
• Vercel AI SDK integration

Do not advertise an SDK or integration before a usable version exists.

Proof

Add operating proof wherever verified information is available.

Potential proof includes:

• 26+ years operating history
• 77,000 sq. ft. production facility
• production categories
• geography
• annual jobs
• annual production volume
• turnaround metrics
• on-time production metrics
• customer count
• pilot volume

Never invent metrics.

If a metric is unavailable, leave a clear implementation placeholder or omit it.

## Case study

Build a reusable case study component.

Required fields:

• customer or anonymized customer type
• production request
• quantity
• number of locations
• integration method
• quote time
• production timeline
• settlement method
• tracking method
• measurable outcome

Do not fabricate customer results.

## Business model

Add a concise commercial architecture section if supported by the brief.

The site should make clear Advertek participates economically in transactions rather than presenting solely as SaaS.

Potential revenue layers include:

• production margin
• Agent Rail transaction fee
• enterprise/API fee
• network routing fee

Do not publish specific pricing percentages unless approved or already part of the product.

SEO

Create strong metadata and page structure around category ownership.

Target concepts include:

AI agent production API

AI agent printing API

MCP print server

commercial printing API

agentic commerce fulfillment

AI packaging API

direct mail API

physical production API

agent manufacturing API

x402 physical commerce

Avoid keyword stuffing.

Each landing page should provide unique value and answer a clear search intent.

Analytics

Instrument key funnel events.

Track events such as:

homepage_view
try_agent_rail_click
demo_started
demo_completed
view_json
view_mcp_call
developer_docs_click
api_access_started
pilot_form_started
pilot_form_submitted
case_study_viewed
pricing_or_quote_created
payment_request_created
payment_completed
order_created

Use the site's existing analytics stack where possible.

Technical quality

# Maintain:

• responsive design
• accessibility
• semantic HTML
• fast loading
• clean URLs
• structured metadata
• sitemap
• robots configuration
• canonical URLs
• Open Graph metadata
• schema markup where relevant
• error handling
• secure environment-variable handling
• no exposed secrets
• no client-side private keys

Performance

# Audit and improve:

• Core Web Vitals
• image loading
• font loading
• JavaScript bundle size
• unnecessary third-party scripts
• layout shifts
• mobile performance

Design

# Preserve the current visual identity unless a change is required for usability.

The experience should feel:

• infrastructure-first
• technical
• credible
• minimal
• institutional
• developer-friendly

# Avoid:

• generic AI gradients
• excessive animation
• fake dashboards
• AI-generated decorative imagery
• buzzword-heavy sections
• oversized blocks of marketing copy

Implementation process

# Work in this order:

Audit existing repository

Identify affected files and architecture

Create implementation plan

Execute P0 work

Run local tests

Resolve regressions

Execute P1 work

Test responsive layouts

Test forms and CTAs

Test demo flow

Validate SEO

Validate accessibility

Validate analytics

Run production build

Provide final change report

Do not stop after producing recommendations.

Implement the changes in the repository.

Before changing architecture, confirm whether an existing pattern already solves the problem.

Testing

Test at minimum:

# Desktop:
1440px

# Laptop:
1280px

# Tablet:
768px

# Mobile:
390px

Validate:

• navigation
• CTAs
• forms
• demo
• API examples
• mobile overflow
• typography
• spacing
• loading states
• error states
• empty states
• page metadata
• internal links
• external links
• 404 behavior

# Run any existing:

• lint
• type checks
• unit tests
• integration tests
• production build

Fix failures introduced by your changes.

Acceptance criteria

# The implementation is complete when:

• no expired timestamps appear
• no false production claims appear
• homepage communicates the product within the first viewport
• Agent Rail demo explains the workflow clearly
• business and developer CTAs are distinct
• lead form friction is reduced
• production proof is visible
• developer onboarding is clearer
• all new pages work on mobile
• analytics cover key conversion events
• metadata is complete
• production build passes
• existing functionality has no material regressions

Final output

# When complete, provide:

Summary of work completed
Files changed
Routes added or modified
Components added
Backend changes
API changes
Analytics added
SEO changes
Items blocked by missing credentials, data, or backend functionality
x402 implementation status
Testing performed
Remaining P2 or future recommendations
For every blocked item, explain exactly what input or credential is required.
Do not mark unfinished work as completed.

Use the attached Advertek Devin Implementation Brief as the source of truth for scope and priority.