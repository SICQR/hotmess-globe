# Reentry invitation — canonical email copy

Brief #02 ship target. Renders verbatim from this file. MJML template at
`email-templates/reentry-invitation.mjml` reads the body. Personalization tokens:

- `{{first_name}}` — `profiles.display_name.split(' ')[0]` or fallback `"mate"`
- `{{reentry_url}}` — `https://hotmessldn.com/reentry?token=<token>`

## Subject

You showed up too early.

## From / Reply-To

`Phil Gizzie <phil@hotmessldn.com>` (Phil's voice, not institutional)

## Body

```
Hey {{first_name|fallback:"mate"}},

A while back — maybe months, maybe over a year — you signed up for HOTMESS.

I want to say sorry. The platform wasn't ready. The age gate was broken on half
the phones it tried to run on, the sign-up loop pushed people back to where
they started, and most of what you came for didn't exist yet.

You turned up anyway. Thank you.

It works now. Properly. Six tier sprites on the globe, SOS rings, proximity
for the people who want it and opt-out for the people who don't. Recovery and
sobriety as first-class identities, not afterthoughts. Radio, market, drops.
The whole thing.

I'm opening the founding cohort this Monday. 50 Original spots. 115 Founding
spots after that. First in, first served — no friend-of-friend, no waitlist
gymnastics.

If you want one: [Claim my spot →]({{reentry_url}})

It'll walk you through age verification again (the old one was busted, sorry),
let you lock your username before someone else takes it, and put you on the
globe.

If you don't want one, no follow-up email. We're cool. I just owed you the
chance.

Phil
HOTMESS

—
Sent from my own address on an actual Sunday morning because I couldn't sleep
until I'd written this. Reply if anything's off — it'll come to me, not a
queue.
```

## Footer

Standard Resend unsubscribe + physical address line (Smash Daddys Ltd
registered address). No marketing varnish, no social icons, no "view in
browser" — keep it personal.
