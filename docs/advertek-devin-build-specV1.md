**IMPLEMENTATION SPECIFICATION**

# **Advertek.io** **Website and Agent Rail Upgrade**

## *Developer-ready build document for Devin*

| Field | Value |
| :---- | :---- |
| Owner | Advertek |
| Executor | Devin |
| Version | 1.0 |
| Status | Ready for implementation |
| Pass threshold | Minimum 7.5 / 10 site audit score |
| Verified against | Live site on 2 September 2026 |

**BUILD OUTCOME**  
Turn the current site into a clear, credible entry point for agent-to-physical commerce. Preserve the current production-infrastructure story. Finish the developer path, x402 sandbox path, agent transaction demo, proof layer, and conversion flow.

**Primary rule:** Never label a capability Live until its end-to-end acceptance test passes in the deployed environment.

# **1\. Executive direction**

The first audit scored the site 6.8 / 10\. The live site now includes several required upgrades. The homepage leads with physical production for AI agents, shows facility proof, presents MCP and REST, and separates Pilot, Demo, and Planned functions. This build closes the remaining gap to the 7.5 pass threshold.

## **Do not rebuild the site**

* Work inside the current framework, component system, deployment flow, and content structure.

* Preserve the current visual identity unless a local change improves clarity or accessibility.

* Keep all existing production-safe validation, pricing, order, and status logic.

* Do not replace real schemas with marketing-only mockups.

* Do not rewrite the stack without a blocking technical reason documented in the pull request.

## **Core positioning**

**APPROVED CATEGORY**  
Advertek Agent Rail is the physical production layer for agentic commerce. It gives AI agents and software platforms a machine-readable path from intent to specification, quote, payment, production, fulfillment, and proof of completion.

Print is the first production wedge. The platform direction extends into packaging, promotional products, signage, direct mail, kitting, merchandise, apparel, and other qualified production categories.

## **Definition of done**

* A first-time visitor understands the product, buyer, workflow, and physical proof within ten seconds.

* A developer reaches a working sandbox request within five minutes from the Developers page.

* The demo shows an agent request moving through spec, quote, payment state, production state, and tracking state in under 30 seconds.

* x402 V2 works on testnet for at least one paid agent service before the site labels x402 as Sandbox.

* No page implies automatic mainnet settlement, autonomous production, or fiat reconciliation before verification.

* Developer and enterprise leads follow separate forms and analytics paths.

* All P0 acceptance tests pass on desktop and mobile.

# **2\. Devin operating instructions**

## **First actions**

1. Open the repository and identify the framework, package manager, route structure, component library, CMS or content files, API routes, database client, test runner, analytics provider, and deployment target.

2. Run the current lint, typecheck, unit tests, integration tests, build, and local preview. Record baseline failures before changing code.

3. Create a feature branch named feat/agent-rail-7-5-pass or follow the repository naming standard.

4. Locate existing status labels, marketing copy, forms, API examples, demo state machine, metadata, sitemap, robots configuration, and environment-variable validation.

5. Build the P0 tickets in dependency order. Keep each ticket reviewable.

6. Run all automated checks, mobile checks, accessibility checks, and end-to-end flows.

7. Open one pull request with screenshots, test output, claim-status evidence, environment changes, and deployment steps.

## **Repository rules**

* Use existing naming, file placement, styling, and server patterns.

* Reuse current components before adding new variants.

* Keep server-only credentials outside client bundles.

* Represent money as integer base units. Do not introduce floats across trust boundaries.

* Validate every external payload with the repository's current schema library.

* Keep mock, demo, sandbox, pilot, and production data visibly distinct.

* Add no unsupported KPI, customer, capacity, quality, or network claims.

## **Expected pull request evidence**

* Route and component summary.

* Before and after screenshots for each public page changed.

* Test results and Lighthouse reports.

* Environment-variable list with secret values removed.

* x402 testnet transaction evidence and response headers.

* Claims registry review showing each public status label.

* Rollback steps.

# **3\. Verified live baseline**

The live review on 2 September 2026 found the following state. Treat this section as the regression baseline.

| Area | Live state | Build implication |
| :---- | :---- | :---- |
| Homepage | Physical production for AI agents. Facility, workflow, API proof, categories, and network vision are present. | Preserve. Add protocol gating, stronger developer entry, and a transaction demo. |
| Platform | Ontology, deterministic pricing, settlement, security, lifecycle, status matrix, and roadmap are present. | Refine x402 architecture and separate service payments from manufacturing settlement. |
| Developers | Quick start, endpoints, MCP config, quote, order, webhooks, errors, limits, and sandbox copy are present. | Add copy-paste SDK examples, OpenAPI, x402 V2 flow, and short sandbox access. |
| Demo | Natural-language request returns a non-binding specification and quote. | Add a visible transaction timeline and payment-state simulation. |
| Access | One long enterprise pilot form. | Create a short developer path. Keep this form for qualified enterprise pilots. |
| Use cases | Five workflows, led by agencies. | Lead with AI agents, commerce agents, and creative automation. |
| Whitepaper | Architecture-led v0.2.0 with clear Pilot, Demo, and Planned labels. | Strengthen the category thesis while preserving technical honesty. |
| x402 | No first-class live implementation or public developer guide observed. | Implement testnet sandbox before adding public Sandbox claims. |

## **What must not regress**

* The 77,000 sq. ft. Toronto facility proof.

* Founded in 1996 and 11 production categories.

* Deterministic pricing language and the rule against invented prices or SKU codes.

* Structured production ontology and exception handling.

* Clear Pilot, Demo, and Planned labels.

* Server-side payment requests and payer-controlled wallet authorization.

* Security statements tied to present implementation.

# **4\. Capability status and claims registry**

Create one typed source of truth for all public product-status labels. Pages must read from this registry or from a shared data layer. Do not duplicate status strings across routes.

| Status | Public meaning | Allowed copy |
| :---- | :---- | :---- |
| LIVE | Verified end-to-end in the deployed production environment. | Available, active, production-ready, supported. |
| PILOT | Functional behind controlled access, configuration, or human review. | Pilot, controlled access, available for selected integrations. |
| SANDBOX | Working against testnet, mock money, or isolated non-production systems. | Sandbox, testnet, non-production. |
| DEMO | Illustrative response or simulated workflow. No production action or funds movement. | Demo, non-binding, simulated. |
| PLANNED | Roadmap only. No public working path. | Planned, roadmap, under development. |

## **Required registry fields**

type CapabilityStatus \= 'live' | 'pilot' | 'sandbox' | 'demo' | 'planned';

interface CapabilityClaim {  
  id: string;  
  label: string;  
  status: CapabilityStatus;  
  publicSummary: string;  
  evidenceUrl?: string;  
  verifiedAt?: string;  
  owner: string;  
}

* Fail CI if a public capability references an unknown status.

* Require verifiedAt and evidenceUrl for Live claims.

* Hide protocol badges whose status is Planned unless the surrounding section is labeled Roadmap.

* Render Demo and Sandbox labels next to the claim, not in a distant footnote.

# **5\. Information architecture and global UX**

| Route | Primary job | Primary CTA | Secondary CTA |
| :---- | :---- | :---- | :---- |
| / | Explain the category and prove execution. | Connect Your Agent | Run the Demo |
| /platform | Explain the rail, ontology, settlement, routing, and status. | Request Pilot Access | View Developer Docs |
| /developers | Get a developer to the first request. | Get Sandbox Access | Open Demo |
| /demo | Show the full transaction sequence. | Start Demo | View Developer Docs |
| /use-cases | Match agent-native workflows to platform value. | Request Access | View Developer Docs |
| /production | Prove the operating facility and capabilities. | Discuss a Pilot | View Platform |
| /whitepaper | Define the category and document current architecture. | Request Access | View Developer Docs |
| /access | Qualify enterprise production pilots. | Request Pilot Access | Developer? Get Sandbox Access |
| /developers/access | Capture low-friction developer interest. | Get Sandbox Access | View Docs |

## **Navigation**

* Primary: Platform, Developers, Use Cases, Production, Whitepaper.

* Persistent primary CTA: Connect Your Agent.

* Mobile menu must expose Demo and Request Access without nested hunting.

* Footer must retain legal, platform, solutions, and company paths.

## **Global components**

* CapabilityBadge with status, tooltip, and accessible text.

* ProtocolBar driven by the claims registry.

* AgentTransactionFlow for homepage, demo, and platform variants.

* CodeBlock with language tabs, copy action, filename label, and keyboard support.

* ProofMetric fed only by approved production facts.

* PrimaryCTA and SecondaryCTA with consistent event names.

* LeadForm with developer and enterprise variants.

# **6\. Homepage build specification**

## **Hero**

Preserve the current category direction. Use the following final copy unless existing conversion data supports the current wording.

**HERO COPY**  
Kicker: ADVERTEK AGENT RAIL  
Headline: Physical production for AI agents.  
Subhead: Give AI agents and software platforms a machine-readable path from intent to quote to payment to production, fulfillment, and tracking.  
Primary CTA: Connect Your Agent  
Secondary CTA: Run the Demo

## **Protocol bar**

* Show MCP, REST API, USDC, Solana, and Physical Fulfillment.

* Show x402 SANDBOX only after AVT-201 through AVT-206 pass.

* Before x402 sandbox approval, omit the badge from the hero. Mention x402 only inside a clearly labeled Roadmap section.

* Each badge links to the related developer section or platform section.

## **Agent transaction flow**

Place this component directly below the hero and facility proof. Use one realistic request and show a short response at each state.

| Step | UI label | Example output |
| :---- | :---- | :---- |
| 1 | Request | Produce 500 branded conference kits and deliver them to Miami by Friday. |
| 2 | Specify | Products, quantity, materials, artwork, deadline, destination. |
| 3 | Validate | Production-safe spec. Exceptions named before quote. |
| 4 | Quote | System price, expiry, turnaround, shipping, settlement unit. |
| 5 | Pay | x402 service payment or manufacturing settlement request, based on transaction type. |
| 6 | Produce | Accepted, assisted review, rejected, or failed. |
| 7 | Track | Normalized status, shipment, tracking, and completion proof. |

## **Two economic layers**

| Layer | What it covers | Payment model | Site treatment |
| :---- | :---- | :---- | :---- |
| Agent services | Discovery, feasibility, preflight, file checks, pricing lookup, shipping calculations, availability, compliance. | Usage-based x402 payments. Start with exact. Evaluate upto or batch settlement later. | Dedicated section titled Paid Agent Services. |
| Physical production | Print, packaging, promotional products, direct mail, signage, merchandise, kitting, and fulfillment. | Full order settlement after a bound quote and approval gate. | Dedicated section titled Physical Production Orders. |

## **Facility proof**

* Retain 1996, 77,000 sq. ft., Toronto, 11 categories, MCP and REST, and North American service geography.

* Add real facility photography with descriptive alt text.

* Add approved equipment, capacity, certifications, turnaround, quality, customer, and annual job metrics only after Advertek supplies source data.

* Never fill missing proof with estimates.

# **7\. Platform page build specification**

## **Approved lead**

**LEAD COPY**  
Headline: The execution layer between AI agents and physical production.  
Support: Agent Rail validates specifications, prices work, handles payment requests, routes jobs, manages exceptions, and returns status through a machine-readable interface.

## **Required changes**

* Keep the production ontology above the fold on desktop or within the first two mobile screens after the overview.

* Add a short MCP \= communication, x402 \= paid service access, Agent Rail \= physical execution explanation.

* Separate Agent Services from Physical Production Orders.

* Add x402 Sandbox to the current product-status matrix only after sandbox tests pass.

* Keep current payment-rail-agnostic positioning. x402 is one access and settlement protocol, not the entire payment strategy.

* Keep the Clean, Assisted, Rejected, and Failed paths visible.

## **Required diagram labels**

Agent or platform  
  \-\> MCP or REST request  
  \-\> production ontology and validation  
  \-\> deterministic quote  
  \-\> approval and payment requirement  
  \-\> production routing  
  \-\> status events  
  \-\> shipment and proof of completion

# **8\. Developer experience build specification**

## **Five-minute path**

1. Choose MCP or REST.

2. Copy a working configuration or request.

3. Call the public catalog.

4. Request a sandbox credential through the short form.

5. Submit a validated quote request.

6. Create a sandbox order or call one paid x402 agent service.

7. Read status through polling or a signed webhook example.

## **Required developer assets**

* OpenAPI 3.1 specification generated from or validated against the actual route schemas.

* Downloadable JSON or YAML link from the Developers page.

* TypeScript examples for REST, MCP, x402 V2, and webhook verification.

* Python examples for REST and x402 V2.

* Copy-ready MCP configuration.

* Environment variable example with placeholders only.

* Response examples for success, validation, unavailable configuration, payment mismatch, assisted review, and failure.

* Visible Last updated date generated from content metadata.

## **Developer page order**

1. Hero and primary Get Sandbox Access CTA.

2. Choose MCP, REST, or x402 Sandbox.

3. Five-minute quickstart.

4. Endpoint overview.

5. Authentication and safety.

6. Quote example.

7. Order and manufacturing settlement.

8. x402 paid agent-service example.

9. Status and webhooks.

10. Errors, idempotency, limits, and retries.

11. OpenAPI, changelog, support, and access form.

## **SDK scope**

Do not publish unsupported SDK packages to npm or PyPI in this build. Ship tested examples and an OpenAPI contract first. Add official SDK packaging as a separate release after the contract stabilizes.

# **9\. Demo build specification**

The current demo proves intent-to-spec and quote. Extend it into a clear agent transaction story without moving funds or submitting production orders.

## **Demo state machine**

| State | Display | Data rule |
| :---- | :---- | :---- |
| INPUT | Prompt field and example requests. | No request sent. |
| PARSING | Intent parsed. | Use current chat endpoint response. |
| SPECIFIED | Structured spec card. | Show validated fields and missing fields. |
| PREFLIGHT | Artwork and feasibility checks. | Mark simulated checks as Demo. |
| QUOTED | Price, expiry, turnaround, shipping. | Show non-binding if production pricing is not configured. |
| PAYMENT\_REQUIRED | HTTP 402 and payment requirement preview. | Use Sandbox only after x402 testnet works. Otherwise use Demo. |
| AUTHORIZED | Payment authorized. | Simulated in public demo unless an explicit testnet wallet flow is enabled. |
| ACCEPTED | Order accepted and queued. | Never imply a production order was created. |
| TRACKING | Status timeline and sample tracking. | Label sample data Demo. |

## **Demo UX rules**

* Show all states within one view on desktop and one vertical timeline on mobile.

* Use plain labels: Demo, Sandbox, Pilot, and Live.

* Keep raw JSON available behind a View response control.

* Announce state changes through an aria-live region.

* Give the user a Reset demo action.

* Track start, step completion, error, and CTA events without prompt text or PII.

# **10\. Conversion and access funnels**

## **Developer funnel**

| Field | Requirement |
| :---- | :---- |
| Work email | Required. Validate on client and server. |
| Company or project | Required. Plain text. |
| Use case | Required. 500 character maximum. |
| Consent | Link Privacy. Use the legal pattern already approved for the site. |
| Hidden metadata | leadType=developer, source route, UTM values, referrer, timestamp. Never trust client values for authorization. |

* Route: /developers/access or an inline form anchored from /developers.

* CTA: Get Sandbox Access.

* Success state: explain response timing only if Advertek supplies a service commitment.

* Submit to the existing lead system if present. Do not add a second lead store without need.

* Add server validation, rate limits, honeypot or current spam control, error logging, and retry-safe submission.

## **Enterprise funnel**

* Keep the current long pilot form at /access.

* Add a top link for developers: Building an integration? Get Sandbox Access.

* Retain workflow, category, order volume, spend, geography, integration, settlement, and timing fields.

* Group fields into Contact, Workflow, Production, Integration, and Timing sections.

* Preserve consent and server-side validation.

# **11\. Use cases and category narrative**

## **New order**

1. AI agents and workflow platforms.

2. Commerce and procurement agents.

3. Creative and marketing automation platforms.

4. Programmatic direct mail.

5. Multi-location brands and franchises.

6. Agencies and creative operations.

7. Enterprise procurement.

For each use case, retain the current structure: Trigger, Problem, Agent Rail Workflow, Human Approval, Result, Categories, Status, and CTA. Rewrite each Agent Rail Workflow to name the task the agent performs automatically.

## **Category section**

**APPROVED COPY DIRECTION**  
Headline: From digital intent to physical output.  
Body: AI systems create content, call tools, and transact through software. Agent Rail gives them a governed path into physical production. Advertek converts machine-readable intent into priced, producible, trackable output.

## **Whitepaper opening**

**TITLE DIRECTION**  
The Agent-to-Physical Economy  
Advertek Agent Rail, architecture and pilot status

Opening direction: AI agents need more than access to software and payments. Physical outcomes require structured specifications, deterministic pricing, approval controls, manufacturing rules, exception handling, settlement, and proof of completion. Agent Rail connects these steps through one machine-readable system built against an operating production floor.

* Keep the current scope note and product-status matrix.

* Keep explicit limits around production submission, payment confirmation, and fiat conversion.

* Add x402 architecture only after the implementation exists in Sandbox.

* Update the version and changelog with every material architecture claim.

# **12\. SEO, metadata, and structured data**

| Route | Title | Meta description direction |
| :---- | :---- | :---- |
| / | Advertek Agent Rail | Physical Production for AI Agents | Connect AI agents to quoting, payment, commercial production, fulfillment, and tracking through MCP and REST. |
| /platform | Agent Rail Platform | Agent-to-Physical Production | See how Agent Rail validates specs, returns deterministic quotes, routes production, and normalizes status. |
| /developers | Advertek Developer Platform | MCP, REST and x402 | Build agent production workflows with API references, MCP tools, sandbox access, x402 payments, webhooks, and examples. |
| /demo | Agent Rail Demo | From Intent to Physical Production | See a non-binding agent request move from specification to quote, payment state, production state, and tracking. |
| /use-cases | Agentic Production Use Cases | Advertek | Explore production workflows for AI agents, commerce platforms, automation tools, direct mail, brands, and agencies. |
| /whitepaper | The Agent-to-Physical Economy | Advertek Whitepaper | Read the architecture, controls, pilot status, settlement model, and roadmap behind Advertek Agent Rail. |

* Add unique canonical URLs, Open Graph tags, social images, and crawlable headings.

* Keep one H1 per page.

* Add Organization and WebSite structured data globally.

* Add TechArticle structured data to the whitepaper.

* Add BreadcrumbList to internal content pages.

* Update sitemap and robots outputs.

* Do not create thin keyword pages in this release.

# **13\. x402 V2 sandbox implementation**

x402 should power paid agent services first. Keep full physical-production settlement tied to the order quote and approval path. The first build must use testnet and a supported facilitator. Production mainnet work is a separate release gate.

## **Initial paid resources**

| Route | Resource | Response after payment |
| :---- | :---- | :---- |
| POST /api/x402/v1/feasibility | Validate whether a structured job fits configured production rules. | Typed feasibility result with reasons and exception path. |
| POST /api/x402/v1/preflight | Run artwork metadata and rule checks supported by the current system. | Typed checks, failures, and next actions. |
| POST /api/x402/v1/shipping-quote | Return supported shipping calculation where live source data exists. | Typed shipping price and service options. |

Start with one resource if only one has real backing logic. Do not expose a paid endpoint whose result is a language-model guess or a static mock.

## **Protocol contract**

1. Client calls a protected resource without payment proof.

2. Server returns HTTP 402 with a V2 PAYMENT-REQUIRED header and typed response body.

3. Client authorizes payment and retries with PAYMENT-SIGNATURE.

4. Server verifies and settles through the configured facilitator.

5. Server returns the resource with PAYMENT-RESPONSE on success.

6. Server returns a structured error with PAYMENT-RESPONSE when settlement fails.

## **Scheme and network**

* Use x402 V2 exact for the first fixed-price paid service.

* Use Solana Devnet during Sandbox if the chosen x402 package and facilitator support the route.

* Use the public x402.org facilitator for testnet only.

* Select a production facilitator or self-hosted path before mainnet.

* Evaluate upto for metered single requests and batch-settlement for repeated micropayments after the first integration is stable.

## **Environment configuration**

X402\_MODE=off|sandbox|production  
X402\_VERSION=2  
X402\_NETWORK=\<CAIP-2 network id\>  
X402\_FACILITATOR\_URL=\<server-only URL\>  
X402\_PAY\_TO=\<receiving wallet\>  
X402\_ASSET=\<supported asset id\>  
X402\_FEASIBILITY\_PRICE\_BASE\_UNITS=\<integer string\>  
X402\_PREFLIGHT\_PRICE\_BASE\_UNITS=\<integer string\>  
X402\_SHIPPING\_PRICE\_BASE\_UNITS=\<integer string\>

* Validate required variables at server start.

* Keep receiving addresses and prices in controlled configuration.

* Never ship private keys to the browser or web tier.

* Do not hardcode production prices in examples.

* Expose a public status flag, not secret configuration values.

## **Idempotency and replay control**

* Support the x402 payment-identifier extension or an equivalent server-side idempotency key.

* Persist payment identifier, request fingerprint, settlement result, resource response hash, and timestamps.

* Return the stored response for an accepted retry. Do not settle twice.

* Reject a reused payment identifier tied to a different request fingerprint.

* Use existing duplicate-settlement protection where the SVM library provides it.

## **x402 acceptance tests**

* No proof returns 402 and PAYMENT-REQUIRED.

* Valid PAYMENT-SIGNATURE returns 200 or 201 and PAYMENT-RESPONSE.

* Wrong network, asset, amount, payee, signature, or expired payload fails with a typed code.

* Duplicate retry does not create a second settlement.

* Facilitator timeout returns a safe retry response and creates no production action.

* Logs omit wallet secrets, signatures, private data, and artwork URLs.

* The public status label changes from Planned to Sandbox only after deployed tests pass.

# **14\. API, security, and operational controls**

## **API requirements**

* Generate OpenAPI from the current schemas or test the hand-authored spec against real handlers.

* Use stable, machine-readable error codes.

* Return request and correlation IDs in responses and logs.

* Support Idempotency-Key for order creation and paid resources where appropriate.

* Document retry rules and rate-limit headers.

* Version breaking surfaces before release.

## **Security**

* Keep API keys in server or trusted agent processes.

* Validate all REST, MCP, webhook, facilitator, pricing, rate, order, and vendor payloads.

* Verify webhook signatures before state changes.

* Apply rate limits to public mutations and key-specific limits to authenticated routes.

* Use least-privilege service credentials.

* Prevent SSRF through artwork and callback URLs.

* Allowlist outbound production, pricing, rate, and facilitator hosts.

* Redact PII and sensitive payloads from logs.

* Keep treasury workers isolated from the web tier.

## **Observability**

* Track quote latency, validation failure rate, payment verification latency, settlement failure rate, human intervention rate, production submission failures, webhook lag, and order-state age.

* Add alerts for payment mismatch spikes, repeated settlement failures, stuck paid orders, and webhook signature failures.

* Include route, capability status, request ID, order ID, and payment identifier in structured logs where safe.

# **15\. Analytics and measurement**

Use the current analytics provider. Do not send prompt text, artwork URLs, wallet signatures, API keys, full addresses, or form-field values.

| Event | Trigger | Safe properties |
| :---- | :---- | :---- |
| hero\_cta\_clicked | Primary or secondary hero CTA. | cta, route, referrer group. |
| protocol\_link\_clicked | Protocol badge click. | protocol, public status. |
| demo\_started | First demo submission. | example vs custom, category only. |
| demo\_step\_viewed | Step becomes visible. | step, status, elapsed bucket. |
| demo\_completed | Final demo state shown. | outcome, elapsed bucket. |
| developer\_access\_submitted | Short form accepted. | source, use-case category. |
| enterprise\_access\_submitted | Long form accepted. | source, selected categories count. |
| code\_copied | Code copy action. | language, example id. |
| x402\_payment\_result | Sandbox payment completes or fails. | resource id, network, outcome, error code. |

## **Launch dashboard**

* Homepage to Developers click-through.

* Developers to sandbox-form start and completion.

* Demo start and completion.

* Enterprise form start and completion.

* Code-copy rate.

* Sandbox activation rate.

* Quote request success rate.

* x402 sandbox payment success rate.

# **16\. Accessibility, performance, and responsive behavior**

## **Accessibility acceptance**

* Meet WCAG 2.2 AA for changed pages and components.

* Support keyboard access, visible focus, logical focus order, and skip navigation.

* Give all form controls labels, descriptions, errors, and status messages.

* Announce asynchronous demo states through aria-live without stealing focus.

* Give diagrams and facility images useful alt text.

* Respect reduced-motion preferences.

* Do not encode status through color alone.

## **Performance acceptance**

* Mobile Lighthouse: Performance 90 or higher on key public routes in the release environment.

* Accessibility 95 or higher, with no serious automated violations.

* LCP at or below 2.5 seconds, CLS at or below 0.1, and INP at or below 200 ms at the 75th percentile when field data is available.

* Lazy-load below-fold facility media.

* Avoid client-side JavaScript for static content.

* Keep code examples and demo transitions stable at 320 px width.

# **17\. Implementation backlog**

Build P0 in the listed order. P1 follows after P0 passes. P2 stays outside the 7.5 release unless Advertek expands scope.

| ID | Priority | Ticket | Exit condition |
| :---- | :---- | :---- | :---- |
| AVT-001 | P0 | Create typed capability claims registry. | Every public status label reads from one source. |
| AVT-002 | P0 | Add protocol bar with status gating. | No x402 Sandbox badge before AVT-206 passes. |
| AVT-003 | P0 | Build reusable AgentTransactionFlow. | Homepage and demo render the full seven-step story. |
| AVT-004 | P0 | Split developer and enterprise access funnels. | Three-field developer form works end-to-end. |
| AVT-005 | P0 | Rebuild developer quickstart and examples. | MCP and REST examples pass against sandbox. |
| AVT-006 | P0 | Publish OpenAPI 3.1 contract. | Contract validates against implemented handlers. |
| AVT-201 | P0 | Select x402 V2 server packages and facilitator path. | Decision recorded with version pinning. |
| AVT-202 | P0 | Implement one paid agent-service route. | Protected route returns a valid 402 challenge. |
| AVT-203 | P0 | Add verification, settlement, and response flow. | Valid testnet payment returns the resource. |
| AVT-204 | P0 | Add idempotency and replay protection. | Retries do not settle twice. |
| AVT-205 | P0 | Add x402 automated tests and observability. | Success and failure suites pass. |
| AVT-206 | P0 | Run deployed x402 sandbox verification. | Evidence supports Sandbox status. |
| AVT-007 | P0 | Add x402 page copy and example after gate. | Public claims match verified sandbox behavior. |
| AVT-008 | P0 | Add SEO metadata and structured data. | All key routes pass metadata audit. |
| AVT-009 | P0 | Add analytics events and privacy checks. | Events arrive without sensitive values. |
| AVT-010 | P0 | Run full regression and release QA. | All P0 gates pass on preview. |
| AVT-101 | P1 | Reorder use cases and revise category copy. | Agent-native use cases lead. |
| AVT-102 | P1 | Revise whitepaper opening and changelog. | Architecture and status stay accurate. |
| AVT-103 | P1 | Add approved facility photography and proof. | Every fact has an internal source. |
| AVT-104 | P1 | Add downloadable API examples repository or package. | Examples run in CI. |
| AVT-301 | P2 | Select production x402 facilitator and mainnet network. | Security and finance approval recorded. |
| AVT-302 | P2 | Evaluate upto and batch-settlement. | Measured traffic supports the added complexity. |
| AVT-303 | P2 | Package official TypeScript and Python SDKs. | API contract has reached release stability. |

# **18\. Test plan and release gates**

## **Automated tests**

* Unit tests for status rendering, CTA routing, schema validation, error mapping, money conversion, and idempotency.

* Integration tests for catalog, quote, order, status, lead forms, OpenAPI parity, webhooks, and x402 testnet adapters.

* End-to-end tests for homepage to developer access, homepage to demo, developer quickstart, enterprise form, and x402 sandbox success and failure paths.

* Accessibility checks for forms, menus, tabs, code-copy actions, demo states, status badges, and modal or disclosure components.

## **Manual QA matrix**

| Surface | Viewports | Checks |
| :---- | :---- | :---- |
| Public pages | 320, 375, 768, 1024, 1440 px | No overflow, clipping, overlap, orphan CTA, or broken navigation. |
| Forms | Mobile and desktop | Labels, errors, success, retry, spam controls, consent, keyboard, analytics. |
| Code examples | Mobile and desktop | Horizontal scroll, copy, focus, correct code, no secret values. |
| Demo | Mobile and desktop | State order, reset, errors, labels, aria-live, raw response. |
| x402 | Testnet | 402, headers, success, failure, idempotency, timeout, logs. |

## **Release gates**

* Lint, typecheck, test, and production build pass.

* No new serious accessibility issue.

* No unsupported public claim.

* No secret or private endpoint in client output.

* Preview passes mobile, desktop, form, demo, and API QA.

* x402 stays hidden or Planned if deployed sandbox verification fails.

* Rollback path is documented and tested.

## **Rollback**

* Keep x402 behind a server-side feature flag.

* Keep public x402 copy behind the same verified status gate.

* Allow the demo to fall back to the present intent-to-spec experience.

* Preserve the existing enterprise form until the new developer form has verified delivery.

# **19\. Pass scorecard**

Use this rubric after deployment. The release passes at 7.5 / 10 or higher with no claim-integrity failure.

| Dimension | Target | Evidence |
| :---- | :---- | :---- |
| Positioning | 8.0 | Hero, category section, and use-case order. |
| Product clarity | 8.0 | Transaction flow and two-layer economic model. |
| Technical credibility | 8.0 | Ontology, OpenAPI, code examples, status matrix, security controls. |
| Developer experience | 8.0 | Five-minute path, short access form, tested examples. |
| Agent-economy positioning | 8.0 | Agent-native workflows and category narrative. |
| x402 alignment | 7.5 | Working V2 testnet route, docs, gating, and idempotency. |
| Trust and proof | 7.5 | Facility facts, real images, sourced claims. |
| Conversion | 7.5 | Separated funnels, clear CTAs, working analytics. |
| Category ownership | 7.5 | Agent-to-physical thesis across homepage and whitepaper. |
| Overall | \>= 7.5 | Independent post-release audit. |

## **Automatic fail conditions**

* x402 is labeled Live or Sandbox without deployed evidence.

* Demo data appears as a binding quote, successful payment, or real production order.

* A developer still needs the full enterprise form to request sandbox access.

* Any core CTA is broken.

* A secret reaches client code, logs, screenshots, examples, or analytics.

* A changed page fails mobile navigation or form submission.

# **20\. Copy-paste Devin task**

Use the text below as the opening Devin instruction. Attach this document and provide repository access.

You are updating advertek.io to pass a minimum 7.5 / 10 product, positioning, developer-experience, trust, and conversion audit. Read the attached Advertek Devin Build Spec v1.0 in full before editing.

Start by auditing the repository and running the existing checks. Preserve the current framework, design system, schemas, production logic, and deployment flow. Build the P0 tickets in dependency order. Do not label x402 as Sandbox until the deployed x402 V2 testnet acceptance suite passes. Never label an unverified capability Live.

Deliver one reviewable pull request with screenshots, automated test results, Lighthouse results, OpenAPI validation, x402 sandbox evidence, environment-variable changes with secrets removed, a claim-status review, release steps, and rollback steps.

If the repository differs from the document, follow the existing architecture and document each material deviation in the pull request. Do not invent pricing, KPIs, customers, equipment, capacity, certifications, order success, or production status.

# **21\. Source references**

Live pages reviewed on 2 September 2026:

* [Advertek homepage](https://www.advertek.io/) 

* [Agent Rail platform](https://www.advertek.io/platform) 

* [Developer platform](https://www.advertek.io/developers) 

* [Interactive demo](https://www.advertek.io/demo) 

* [Pilot access](https://www.advertek.io/access) 

* [Use cases](https://www.advertek.io/use-cases) 

* [Whitepaper](https://www.advertek.io/whitepaper) 

x402 implementation references reviewed on 2 September 2026:

* [x402 introduction](https://docs.x402.org/introduction) 

* [HTTP 402 and V2 headers](https://docs.x402.org/core-concepts/http-402) 

* [Client and server flow](https://docs.x402.org/core-concepts/client-server) 

* [Facilitator model](https://docs.x402.org/core-concepts/facilitator) 

* [Payment schemes](https://docs.x402.org/schemes/overview) 

* [Networks and token support](https://docs.x402.org/core-concepts/network-and-token-support) 

* [Payment identifier extension](https://docs.x402.org/extensions/payment-identifier) 

* [MCP server with x402](https://docs.x402.org/guides/mcp-server-with-x402) 