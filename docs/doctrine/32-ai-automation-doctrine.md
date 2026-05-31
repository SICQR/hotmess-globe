# D32 — AI & Automation Doctrine

**Status:** canonical. Established 2026-05-31.
**Inherits from:** D08 (Visibility), D15 (Care Language), D17 (Surface Layer), D19 (Marketplace), D20 (Identity), D21 (Payment & Payout), D22 (Temporal), D33 (Memory & Permanence), D34 (Trajectory), D31 (Venue & Partner Power).
**Inherited by:** any future doctrine introducing model-mediated automation.

---

## §0 Why this doctrine exists

D33 made surveillance retention type-system-impossible at the substrate. D21 extended the discipline to peer settlement. D31 extended it to operator power. Each of those doctrines defended against a specific reconstruction vector that platforms historically fail at — analytics tables, identity-bearing settlement ledgers, per-operator user attribution.

There is one reconstruction vector all three doctrines leave open: **the model.**

A large language model with access to per-user trajectory history, per-pair chat history, beacon resolution outcomes, or operator-side aggregate data does not need a SQL join to reconstruct identity-bearing patterns. It does so implicitly, inside its context window, every time it generates a response. The substrate does not contain the join; the model performs the join on the fly from whatever you handed it as context.

This means: **LLMs are implicit reconstruction engines.** Without explicit doctrine, the first contributor proposing "let's just give the model trajectory history for better recommendations" bypasses D22, D33, D21, and D31 simultaneously — not by editing the substrate, but by feeding the substrate's outputs (or worse, its inputs) to a model that synthesises across them.

D32 is the doctrine that ensures HOTMESS's substrate-incapability commitments survive the introduction of any model-mediated automation. It defines what models may receive as input, what they may produce as output, what they may persist, and what shape of feature they may not, under any pressure, ever become.

The single sentence: **models inherit substrate incapability. If the substrate cannot know it, the model cannot infer, store, summarise, embed, rank, or reconstruct it.**

---

## §1 Scope

D32 governs:

- Any LLM-based feature that consumes user-generated content, beacon metadata, chat content, presence data, or settlement metadata.
- Any embedding generation, vector index, or semantic-search system applied to user-bearing content.
- Any recommendation, ranking, or routing system that derives output from a model rather than from a deterministic rule.
- Any classification, moderation, tone-checking, or summarisation system applied to user-bearing content.
- Any cross-property model context shared between HOTMESS, HOTMESS RADIO, HNH MESS, or any future property under the HOTMESS umbrella.
- Any agent-shaped automation that performs actions on behalf of a user, an operator, or the platform.

D32 does NOT govern:

- Deterministic rule-based logic that does not consult a model. (D33 already governs whatever substrate that logic writes.)
- Authoring assistance Phil or HOTMESS team use for internal work product (e.g., this doctrine, code review, infra investigation). Those are operator-side tools, not user-facing features, and they do not consume user-bearing content from the substrate.
- Models hosted by infrastructure providers in their own systems (e.g., Stripe's fraud model, Vercel's analytics model). Those are vendor-side and HOTMESS does not feed user-bearing data to them beyond what the existing integrations carry.
- Generative art / copy production tools used by Phil for brand work where no user-bearing data is consumed.

---

## §2 The five model-incapability commitments

Mirroring D33's five substrate-incapability commitments at the model layer. A model-mediated feature is D32-compliant when it satisfies all five of:

**§2.1 — Substrate inheritance.** A model is given as input only what a D33-compliant function would return. If the atmospheric residue would return a counter, the model receives a counter, not a per-event log. If a regulated read would require operator-audit logging, the model cannot bypass that gate. Models are downstream consumers of substrate-compliant outputs; they do not get privileged read paths.

**§2.2 — No identifying context.** Actor identifiers, target identifiers, beacon identifiers, precise timestamps, exact venue labels, and cross-user joins are never placed in a model's context window for any feature that surfaces output to users (or to operators). This holds even if the model "would not retain" the identifier — the prohibition is on the placement, not on the persistence.

**§2.3 — Bounded memory window.** Models do not retain conversation state across sessions, do not maintain per-user latent profiles, and do not perform cross-conversation summarisation that could reconstruct trajectory. Each model invocation receives only the context required for that invocation, and that context is discarded when the invocation completes. The model does not "remember the user."

**§2.4 — Locked output domain.** Model outputs that affect substrate state, surface state, or user-visible classification are constrained to a fixed enum or schema, validated before the substrate or surface accepts them. Models do not produce free-form text that becomes substrate state. They produce structured outputs that match a contract D33 already enforces.

**§2.5 — Single observation path.** Model invocations are logged through one observability surface, with the prompt schema and output schema (not the per-invocation content) recorded. Adding a new model call requires registering it in this observability surface. Models do not get to be "internal helpers" that nobody catalogues.

Each commitment is enforced at a different layer:
- §2.1 — read-path discipline (the model's input must satisfy D33).
- §2.2 — prompt construction discipline (what enters the context window).
- §2.3 — invocation lifecycle (per-call, no carry-over).
- §2.4 — output validation (structured returns, enum-locked).
- §2.5 — operability discipline (model usage is itemised, not ambient).

---

## §3 The substrate-inheritance principle

This is the central thesis of D32 and deserves its own section.

**§3.1 — If the substrate cannot know something, the model cannot infer it.** A feature whose model invocation derives a fact that the substrate-incapability layer forbids has violated the doctrine, regardless of whether the model "retains" the derivation. The synthesis itself is the violation. Example: a model that reads per-handoff chat history and derives "user X and user Y are likely seeing each other" has reconstructed a relationship D33 §1.2 + D22 §4 forbid the substrate from holding. The model's output is constitutional drift, even if no row is written.

**§3.2 — If the substrate cannot link two things, the model cannot link them either.** A model that receives D33-compliant aggregate outputs as context cannot be asked to "look across" those outputs in ways that would re-introduce the linkages D33 explicitly removed. Asking a model to "combine the atmospheric residue with the regulated settlement log to identify the top spending users" is asking it to perform the join D21 §3.3 made mathematically degraded. The model is more capable than SQL at fuzzy joins; that is why the model cannot be asked to perform them.

**§3.3 — If the substrate forgets something, the model must not preserve it.** Model-mediated summarisation that retains content past the substrate's decay window violates D22. A model that produces a "user trajectory summary" persisted to a profile cache, even if the source trajectory has decayed past `recent` into `gone`, has resurrected what the substrate explicitly forgot. Forgetting at the substrate must be honoured by the model layer.

**§3.4 — If the substrate prohibits identifying columns, the model must not produce identifying embeddings.** A vector embedding of a user's chat content, listing history, or beacon-resolution pattern is functionally an identifying column — embeddings are reversible to source content with sufficient access to the embedding space. Storing per-user embeddings violates D33 §1.2 in a different form. Embeddings used for semantic search must be applied to ephemeral query strings, not to persisted user representations.

---

## §4 Specifically prohibited patterns

D32 explicitly forbids the following classes of feature:

**§4.1 — Per-user latent profiles.** No "user vector," no "preference embedding," no "behavioural signature." Even if "anonymised," these reconstruct individual identity within the model's representation space and persist past any decay window.

**§4.2 — Cross-conversation memory.** No "the model remembers your previous chats." No "the assistant has context about you." Each invocation is fresh; the model has no longitudinal awareness.

**§4.3 — Latent trust scoring.** No model-derived trust score, reputation embedding, or risk vector applied to a user. Trust is governed by explicit interaction (D34 trajectory ladder), not by model inference.

**§4.4 — Emotional manipulation loops.** No model output that is optimised against an engagement metric (time-in-app, return rate, message frequency, conversion). Models do not produce copy whose target is to keep the user engaged. They produce copy whose target is to be honest and useful, per D15.

**§4.5 — Cross-property behavioural inference.** No model context that joins HOTMESS user behaviour with HOTMESS RADIO listening behaviour, HNH MESS purchase behaviour, or any future property. Each property carries its own substrate; the model does not get to bridge them. Cross-property models are forbidden.

**§4.6 — "AI knows you better than you do" framings.** No surface that claims a model has insight into the user's identity, desires, recovery state, relationship status, mental health state, or future behaviour. These are framings users cannot consent to meaningfully because the inference is invisible.

**§4.7 — Implicit recommendation models.** No "for you" ranking driven by a model that has consumed user history. Ranking is rule-based and reviewable. Where a model is used for ranking, its inputs are aggregate atmospheric reads (not per-user history) and its outputs are deterministic given those inputs.

**§4.8 — Auto-generated identity content.** No model-generated bio, no AI-suggested profile photo, no "auto-fill your interests." Identity content is user-authored. Suggestions are templates with user-edited fields, not model outputs.

**§4.9 — Model-mediated moderation as the only path.** Models may assist moderation (e.g., flagging potentially-violating content for human review). They do not auto-action user-visible consequences. A model flag without human review does not remove content, suspend a user, or alter visibility.

**§4.10 — Chat-side conversational AI to handoff parties.** Models do not impersonate, ghost-write, or pre-compose chat messages between users. Chat openers are template-based with user-edited content (per the convergence slice contact paths); models do not insert themselves into the per-pair conversation.

---

## §5 Specifically permitted uses

D32 permits, with discipline:

**§5.1 — Ephemeral query-time semantic search.** A user types a search query; the query is embedded; the embedding is matched against a pre-computed embedding of editorial / care / venue content (not against per-user content); results are returned. The user's query is not retained. The user is not embedded.

**§5.2 — Editorial / care content authoring assistance for operators.** An operator drafts a venue description; a model assists with tone alignment to D15. The model consumes the operator's draft only; no user-bearing data is in context.

**§5.3 — Atmospheric summary generation.** Aggregate atmospheric residue feeds a model that produces a short editorial summary ("Vauxhall was alive last weekend") for surface display. Inputs are aggregate counters; outputs are validated against D15 tone constraints and a length cap; nothing per-user enters the prompt.

**§5.4 — Care language tone-checking.** Care-suite copy authored by the team is checked against D15 by a model. No user-bearing content; team-side authoring tool only.

**§5.5 — Code/infra assistance for the team.** Model assistance for engineering work that does not consume user-bearing content. This includes the assistance used to draft this doctrine.

**§5.6 — Safety classification with human review.** Models flag potentially-harmful content for human review. The model does not action the consequence. The flag enters the moderation queue; a person decides.

**§5.7 — Operator-side aggregate dashboard summarisation.** A model produces a short summary of the operator's aggregate atmospheric reads ("this week's busiest bucket was Saturday late-night, ticket-class handoffs up"). Same shape as §5.3 — aggregate-in, validated-text-out.

Each permitted use satisfies §2.1–§2.5. Each is a category, not a blanket licence — every specific feature within a category must independently demonstrate D32 compliance in its acceptance test.

---

## §6 Context-window discipline

Per §2.2, what enters the model's context window is the critical control point.

**§6.1 — Prompts are schemas, not freeform strings.** A prompt template is a typed structure with explicit fields. The fields are populated from D33-compliant outputs. A new field requires a doctrinal review; "we'll just add a field for X" is the same audit moment as adding a column to a constitutional persistence primitive.

**§6.2 — User-bearing content is content the user produced, not content about the user.** A user's drafted bio is content they produced; a model can assist them with editing it at their request. A list of the user's recent beacons, an aggregate of their handoff history, or a summary of their mutual connections is content ABOUT them and is forbidden as input to model-mediated features (even ones the user invokes).

**§6.3 — Cross-user content in context requires explicit mutual consent at the moment of invocation.** A model may consume a per-pair chat thread for a feature both parties have explicitly invoked together (e.g., a care-resource suggestion at the close of a chat). It does not consume that thread for any other purpose, ever. Mutual consent at the moment of invocation is the contract.

**§6.4 — System prompts are reviewable artefacts.** The system prompt of any user-facing model invocation is documented in the repo, version-controlled, and changes go through doctrinal review. There is no "production model behaviour" that is not visible in code review.

**§6.5 — No "long context dumps."** Loading a large fraction of substrate state into a model context to "let it figure out what's relevant" is per-se forbidden. Inputs are minimal, structured, and justified field-by-field.

---

## §7 Memory boundaries

Per §2.3, models do not accumulate user-shaped memory.

**§7.1 — No conversation memory across sessions.** Each user-facing model invocation is fresh. The model does not "remember our previous chat."

**§7.2 — No per-user fine-tuning.** Models are general; their behaviour does not adapt to specific users over time. If a model's behaviour ever appears to "know" a particular user, that is a violation.

**§7.3 — No persistent caches of model outputs keyed to users.** A "summary of user X's interests" cached anywhere in the substrate violates §3.4. Caches that exist for performance reasons must be content-keyed (e.g., cache an editorial summary by venue + week, never by user).

**§7.4 — D22 decay applies to model outputs.** Where a model output is briefly cached (e.g., the operator atmospheric summary of §5.7 may be cached for the display window), the cache obeys the same decay D22 §3 applies to the underlying signal. A cached summary of a window that has rolled past the atmospheric decay boundary is invalidated.

---

## §8 No latent trust scoring

This deserves its own section because it is the temptation that will be framed as "safety."

**§8.1 — Trust is interaction-grounded, not model-derived.** D34 establishes the trajectory ladder (Ambient → Contextual → Coordinated → Converged → Trusted → Care). A user's trust position relative to another user is determined by their explicit interactions. A model does not derive a "trust score" from interaction patterns.

**§8.2 — Safety classification is not trust scoring.** A model may flag a specific piece of content as potentially harmful for human review (§5.6). It does not produce a persistent score that says "this user is risky" or "this user is trustworthy."

**§8.3 — No reputation embedding.** A user's interaction history does not produce a vector representation used downstream for ranking, filtering, or visibility decisions. D08 visibility states are user-controlled; D34 trust positions are interaction-grounded; neither is model-inferred.

**§8.4 — No "shadow ban" automation.** No model decides to reduce a user's visibility, downrank their beacons, or hide them from peers. Moderation actions of that kind are explicit, human-reviewed, and operator-audit-logged per D33 §3.4.

---

## §9 No emotional manipulation loops

**§9.1 — No engagement-optimised model output.** A model whose output is optimised against time-in-app, return rate, beacon-drop frequency, or any user-behavioural metric violates §4.4. The optimisation target for any user-facing model output is honesty and usefulness, per D15.

**§9.2 — No "right time to engage" inference.** No model-derived prediction of when a user is most likely to respond, return, or convert, used to time platform-originated messaging.

**§9.3 — No emotional state inference.** No model output that infers, claims to know, or acts on a user's emotional state ("you seem upset," "you're probably feeling X," "you might be lonely"). This is particularly important given HOTMESS's recovery-advocacy context — emotional-state inference applied to people in recovery is a category of harm, not a feature.

**§9.4 — Care-suite framings are user-pulled, not model-pushed.** Care resources surface when a user navigates to them or when a beacon resolution opens a care-resource template. They do not surface because a model inferred the user "needs" them. Care discovery is a path the user chooses; the model does not nudge.

---

## §10 Cross-property behavioural inference ban

Per §4.5. HOTMESS, HOTMESS RADIO, HNH MESS, and any future property under the umbrella are user-facing distinct substrates. The user may have an account on multiple; their behaviour on each is governed by the surface they are on.

**§10.1 — No cross-property user context in any model invocation.** A model serving the HOTMESS app does not receive HOTMESS RADIO listening history. A model serving HNH MESS does not receive HOTMESS app convergence history. The property boundaries are constitutional.

**§10.2 — No cross-property user-level embedding shared.** Even if technically possible, no per-user embedding is shared across property substrates. Each property's read surfaces remain within that property.

**§10.3 — Aggregate cross-property atmospheric reads are permitted.** A model may consume "HOTMESS RADIO peak listen times" and "HOTMESS app peak convergence times" together if both are D33-compliant aggregates with no per-user identifiability. Cross-property is forbidden at the per-user layer; it is permitted at the atmospheric layer.

**§10.4 — Cross-property identity binding is doctrinally separate.** If a future doctrine introduces user-controlled cross-property identity linking (e.g., "see my HOTMESS RADIO favourites on my HOTMESS profile"), that is a user-initiated disclosure and is governed by D20 + the new doctrine, not by D32. D32's ban here is on automated/inferred cross-property inference, not on user-initiated disclosure.

---

## §11 Acceptance test for any D32 implementation PR

When a model-mediated feature ships, it must answer the D33 §9 seven-question test for any persistence it introduces, plus these D32-specific questions:

§11.1 — Show the system prompt verbatim. Confirm it does not request identifying context.

§11.2 — Show the prompt input schema. List every field. For each, confirm it is either (a) user-supplied at the moment of invocation or (b) a D33-compliant aggregate.

§11.3 — Show the output schema. Confirm it is structured/enum-locked, not freeform text, OR demonstrate it is a user-display text validated against length + tone constraints (D15).

§11.4 — Show that no model output is persisted in a per-user-keyed cache.

§11.5 — Show the invocation lifecycle. Confirm no cross-session state, no per-user fine-tuning.

§11.6 — Demonstrate that the feature does not produce identity-binding, trust-scoring, emotional-state, or cross-property inferences.

§11.7 — Show the observability registration entry. Confirm the new model call is itemised, not ambient.

A PR introducing a model-mediated feature without all seven answers does not ship.

---

## §12 Drift indicators

In addition to D33 §10, D21 §12, D31 §10:

- A "user vector," "preference embedding," "interest profile," or "behavioural signature" appearing in any data store.
- A prompt template field labelled `recent_history`, `chat_log`, `trajectory`, or `user_context` populated from substrate reads.
- A model call labelled "personalisation," "for-you," "smart," "intelligent," or "predictive" applied to per-user surfaces.
- A model output being cached with a user_id key.
- An "AI assistant" surface that purports to remember the user.
- A safety-classification model auto-actioning user-visible consequences.
- A model-generated bio, headline, or interest list rendered as the user's own.
- A "best time to ping" or "user activity prediction" feature.
- A cross-property model context proposed for "better recommendations."
- A "shadow rank" or visibility adjustment driven by model output rather than explicit rule.
- An engagement-metric-optimised LLM loop, including A/B-tested copy variants chosen by model.
- A model-driven inference of emotional state, recovery state, or relationship status.
- A long-context dump justification framed as "let the model figure out what's relevant."

Each is an audit moment. Revert and refactor.

---

## §13 Boardroom test framing

For non-engineering stakeholders considering D32 under AI-adoption pressure:

- "Can we add an AI assistant that learns from each user?" — No. §4.2 + §7 bind. Each invocation is fresh.
- "Can we use embeddings for better matching?" — Only on ephemeral query content matched against editorial content. Not on per-user vectors.
- "Can we use AI to flag risky users?" — Safety classification with human review only, per §5.6. No latent trust scores.
- "Can we use AI to suggest the best time to send notifications?" — No. §9.2 binds.
- "Can we let the AI write users' profile bios?" — No. §4.8 binds. Users author identity.
- "Can we share user data across HOTMESS properties for unified personalisation?" — No. §10 binds. Cross-property at per-user level is forbidden.
- "Can we use AI to predict which beacons will convert?" — Aggregate ranking with deterministic rules only. No per-user predictive inference.
- "Can we use AI to optimise our engagement metrics?" — No. §9.1 binds. The optimisation target is honesty + usefulness, not engagement.
- "An LLM vendor wants to train on our anonymised chat data" — No data leaves the platform's substrate to a vendor for training. Per §10.2 + D33 §5.
- "We have a chance to use AI for emotional support" — D32 §9.3 + D15 bind. Care discovery is user-pulled. AI does not infer or act on emotional state.

---

## §14 Forward inheritance

**§14.1 — Future agent-shaped features.** When (or if) HOTMESS introduces agent-shaped automation that performs actions on behalf of a user (e.g., an AI that helps draft a beacon, that suggests venues, that proposes a meet-up), each action must be a user-initiated, user-confirmed, user-visible step. The agent is a typing assistant, not an actor. D32 §2 applies in full.

**§14.2 — Future model-supplier diversification.** D32 binds regardless of which model is in use. Migrating from one model vendor to another is an infrastructure change; the doctrinal commitments survive the change. A "new model is more capable" claim does not relax D32.

**§14.3 — Future open-source local models.** Running models locally (e.g., on-device) does not relax D32. The doctrinal commitments are about what is asked, not about where it is asked. A local model that performs cross-conversation memory violates §7.1 the same way a hosted one would.

**§14.4 — Future fine-tuned models.** Fine-tuning a model on HOTMESS-specific corpora is permitted for non-user-bearing corpora (e.g., editorial style, care language). Fine-tuning on user-bearing content is forbidden, even with "consent," because the consent cannot be meaningfully informed about what a fine-tuned weight encodes.

---

## §15 Naming and references

- **The doctrine binding is "model-incapability"** — mirror of D33's substrate-incapability.
- **The central principle is "models inherit substrate incapability"** — §3.
- **The framing for engineers is "LLMs are implicit reconstruction engines"** — §0.
- **The model observability surface** (when it ships) catalogues every model call.
- **The system prompt registry** holds every production system prompt under version control.

Reference for inheritance:
- `docs/doctrine/33-memory-permanence-doctrine.md`
- `docs/doctrine/22-temporal-doctrine.md`
- `docs/doctrine/20-identity-doctrine.md`
- `docs/doctrine/34-trajectory-doctrine.md`
- `docs/doctrine/15-care-language-doctrine.md`
- `docs/doctrine/21-payment-payout-doctrine.md`
- `docs/doctrine/31-venue-partner-power-doctrine.md`

---

## §16 What ships next

D32 is now a written constitutional commitment. No model-mediated feature lands without inheriting it.

The first implementation work, when scoped, will likely take this shape:

1. **Slice 1 — Model observability surface.** Migration + minimal logging table that records the schema (not content) of every model invocation. Locks the "models do not get to be internal helpers" rule structurally.
2. **Slice 2 — System prompt registry.** Repo location + format convention for production system prompts, with doctrinal review gate on changes.
3. **Slice 3 — Atmospheric editorial summary.** First D32-compliant model feature: aggregate atmospheric residue → short editorial summary for surface display (§5.3). Proves the pattern end-to-end with no user-bearing data.
4. **Slice 4 — Care-suite tone checker.** Team-side authoring tool checking care-suite copy against D15. No user-bearing data, no production runtime cost.
5. **Slice 5 — Operator atmospheric dashboard summary.** Operator-side aggregate summary (§5.7). Inherits D31 + D32.

Each slice ships independently with D32 acceptance test answered. No slice ships before D32 has been merged.

---

## §17 Closing

HOTMESS will use AI. Models will assist with editorial, with care-language alignment, with atmospheric summarisation, possibly with safety classification under human review. The use will not be the route by which substrate-incapability is undone.

The substrate-inheritance principle (§3) is the central architectural commitment. If the substrate cannot know it, the model does not infer it. Models do not bypass D22, D33, D21, or D31 by being more clever than SQL at the joins those doctrines explicitly removed.

The most important sentence in this doctrine, for the contributor reading it five years from now under acquisition pressure: **the synthesis itself is the violation.** It is not enough that the model "doesn't retain" the inference. The inference is the breach of the doctrine, regardless of where it lives after it occurs.

D32 is not anti-AI. It is anti-implicit-reconstruction. The platform will be more useful with models in it. It will not be more knowing about its users.

That is the commitment.
