# HOTMESS Business Operations Manual

## Overview

This document provides operational guidelines for running the HOTMESS platform, including daily operations, support workflows, payment handling, and moderation procedures.

## Table of Contents

1. [Daily Operations Checklist](#daily-operations-checklist)
2. [Support Ticket Handling](#support-ticket-handling)
3. [Payment & Subscription Management](#payment--subscription-management)
4. [Content Moderation](#content-moderation)
5. [User Safety Protocols](#user-safety-protocols)
6. [Business Metrics Monitoring](#business-metrics-monitoring)
7. [Communication Templates](#communication-templates)

---

## Daily Operations Checklist

### Morning Routine (Start of Day)

- [ ] Check Admin Dashboard for overnight activity
- [ ] Review support tickets - prioritize urgent/safety issues
- [ ] Check Stripe dashboard for payment issues
- [ ] Review moderation queue for flagged content
- [ ] Check system health (Vercel, Supabase dashboards)
- [ ] Review new user signups and verifications pending

### Evening Routine (End of Day)

- [ ] Process all remaining urgent tickets
- [ ] Clear moderation queue backlog
- [ ] Review day's metrics (users, revenue, engagement)
- [ ] Document any issues encountered
- [ ] Ensure all safety reports are addressed

### Weekly Tasks

- [ ] Review subscription metrics (MRR, churn, conversion)
- [ ] Analyze user feedback and feature requests
- [ ] Check for expired events and beacons cleanup
- [ ] Review and update FAQ if common questions arise
- [ ] Team sync on platform health and improvements

---

## Support Ticket Handling

### Ticket Categories & Response Times

| Category | Priority | Target Response Time |
|----------|----------|---------------------|
| Safety | Urgent | 1 hour |
| Billing | High | 4 hours |
| Technical | Normal | 24 hours |
| General | Normal | 24-48 hours |
| Feedback | Low | 48-72 hours |
| Business | Normal | 24 hours |

### Ticket Workflow

1. **New Ticket Arrives**
   - Auto-categorized by user selection
   - Safety tickets auto-escalated to urgent priority
   - Confirmation email sent to user

2. **Initial Triage**
   - Admin reviews ticket
   - Assigns appropriate priority
   - Sets status to "In Progress"

3. **Response**
   - Use appropriate template
   - Provide clear, actionable guidance
   - Set status to "Waiting Response" if user action needed

4. **Resolution**
   - Mark as "Resolved" when issue is fixed
   - Send resolution confirmation
   - Close after 7 days of no response

### Escalation Procedures

**Level 1 (Support Team)**
- General inquiries
- Basic technical issues
- Account questions

**Level 2 (Senior Support)**
- Complex billing disputes
- Policy violations
- Multi-step technical issues

**Level 3 (Management)**
- Legal concerns
- Safety emergencies
- Payment fraud
- PR-sensitive issues

---

## Payment & Subscription Management

### Subscription Tiers

| Tier | Price | Key Features |
|------|-------|--------------|
| BASIC | Free | Standard access |
| PLUS | £9.99/mo | 2x XP, stealth mode, blurred viewers |
| CHROME | £19.99/mo | Unmasked viewers, early access, premium support |

### Common Payment Issues

#### Failed Payments
1. Check Stripe dashboard for error details
2. User receives automatic retry notification
3. After 3 failed attempts, subscription becomes "past_due"
4. Contact user proactively if high-value subscriber

#### Refund Requests
1. Check user's subscription history
2. Verify reason for refund
3. For first-time requests within 14 days:
   - Process full refund via Stripe
   - Update user tier in database
4. For other cases:
   - Review case-by-case
   - Document decision and reasoning

#### Subscription Cancellations
1. Confirm cancellation in Stripe
2. User retains access until period end
3. Send retention email (optional)
4. Process downgrade to BASIC at period end

### Stripe Dashboard Actions

```
Refund: Stripe Dashboard → Payments → Select Payment → Refund
Cancel Sub: Stripe Dashboard → Customers → Select Customer → Subscriptions → Cancel
Update Card: Direct user to /membership-upgrade (self-service)
```

---

## Content Moderation

### Moderation Queue Priority

1. **Immediate Action Required**
   - Safety threats
   - Illegal content
   - Underage content
   - Non-consensual content

2. **High Priority**
   - Harassment reports
   - Hate speech
   - Scam/fraud attempts

3. **Standard Review**
   - Profile violations
   - Spam content
   - Policy breaches

### Moderation Actions

| Action | When to Use | Effect |
|--------|-------------|--------|
| Approve | Content follows guidelines | Content published |
| Remove | Minor violation | Content hidden, user warned |
| Warn | First offense | Warning recorded, content removed |
| Suspend (24h-7d) | Repeated violations | Account temporarily disabled |
| Ban | Severe/repeated violations | Permanent account termination |

### Ban Appeal Process

1. User submits appeal via Settings → Safety → Moderation History
2. Different moderator reviews original decision
3. Decision within 7 business days
4. If overturned, restore account and notify user
5. If upheld, final decision communicated

---

## User Safety Protocols

### Emergency Situations

**If a user activates panic button:**
1. System sends alert to emergency contacts
2. Log panic event in admin dashboard
3. Follow up within 1 hour if possible
4. Document incident

**If safety report indicates immediate danger:**
1. Escalate to Level 3 immediately
2. Consider contacting authorities if:
   - Imminent physical threat
   - Evidence of illegal activity
   - User appears to be in crisis

### Safety Check-In System

- Users can enable safety check-ins for meetings
- System prompts for check-in after specified time
- If no response:
  1. Wait 15 minutes
  2. Send reminder notification
  3. If still no response, alert emergency contacts

### Reporting Workflow

1. User submits report
2. Auto-flag reported user/content
3. Preserve evidence (screenshots, messages)
4. Investigate within 24 hours
5. Take action based on findings
6. Notify reporter of outcome (privacy-preserved)

---

## Business Metrics Monitoring

### Key Performance Indicators (KPIs)

**Growth Metrics**
- Daily/Weekly Active Users (DAU/WAU)
- New user signups
- User retention (D1, D7, D30)
- Referral conversions

**Revenue Metrics**
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Subscription conversion rate
- Churn rate (monthly)
- Lifetime Value (LTV)

**Engagement Metrics**
- Events created/attended
- Messages sent
- Check-ins per day
- Marketplace transactions

### Dashboard Locations

| Metric | Location |
|--------|----------|
| User stats | Admin Dashboard → Analytics |
| Revenue | Admin Dashboard → Analytics + Stripe Dashboard |
| Support | Admin Dashboard → Support |
| Engagement | Admin Dashboard → Advanced |

### Alert Thresholds

Set up monitoring alerts for:
- Error rate > 1%
- API response time > 2s
- Payment failures > 5% of attempts
- Support queue > 50 open tickets
- Safety reports > 10/day

---

## Communication Templates

### Support Ticket Responses

**Acknowledgment:**
```
Hi [Name],

Thank you for contacting HOTMESS support. We've received your request regarding [subject].

We're looking into this and will get back to you within [timeframe].

Ticket ID: #[ID]

Best,
HOTMESS Support Team
```

**Resolution:**
```
Hi [Name],

Good news! We've resolved your support request.

[Details of resolution]

If you have any further questions, please don't hesitate to reach out.

Best,
HOTMESS Support Team
```

**Refund Confirmation:**
```
Hi [Name],

We've processed your refund request for £[amount].

The funds should appear in your account within 5-10 business days, depending on your bank.

Your subscription has been updated accordingly.

Best,
HOTMESS Support Team
```

### Safety Communications

**Account Suspension Notice:**
```
Your HOTMESS account has been suspended due to a violation of our Community Guidelines.

Reason: [Specific violation]
Duration: [Period or Permanent]

You may appeal this decision through Settings → Safety → Moderation History.

— HOTMESS Safety Team
```

**Report Acknowledgment:**
```
Thank you for reporting this to us. Your safety matters.

We're reviewing your report and will take appropriate action. You won't see updates to protect privacy, but rest assured we're investigating.

If you feel unsafe, please use the panic button or contact emergency services.

— HOTMESS Safety Team
```

---

## Emergency Contacts

**Internal:**
- Safety Team: safety@hotmess.london
- Technical Support: support@hotmess.london
- Legal: legal@hotmess.london

**External:**
- UK Emergency: 999
- National Domestic Violence Hotline: 0808 2000 247
- Samaritans: 116 123

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-28 | Initial business operations manual |

---

*This document should be reviewed monthly and updated as procedures evolve.*
