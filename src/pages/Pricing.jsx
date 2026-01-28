/**
 * Comprehensive Pricing Page
 * 
 * Displays all pricing tiers, fees, and packages for:
 * - User memberships
 * - MESSMARKET sellers & buyers
 * - Ticket resale
 * - Venue advertising
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Check, 
  X, 
  Zap, 
  Store, 
  Ticket, 
  MapPin, 
  Globe, 
  Sparkles,
  ChevronDown,
  Calculator,
  Users,
  Building2,
  Megaphone,
  Star,
  Shield,
  ArrowRight,
  Info,
  Radio,
  Mic,
  Music,
  Headphones,
  Volume2,
  PlayCircle
} from 'lucide-react';
import {
  MEMBERSHIP_TIERS,
  MESSMARKET_SELLER,
  MESSMARKET_BUYER,
  TICKET_RESALE,
  VENUE_PACKAGES,
  GLOBE_ADVERTISING,
  RADIO_ADVERTISING,
  XP_PACKAGES,
  CREATOR_FEES,
  formatPrice,
  calculateSellerEarnings,
  calculateTicketFees,
} from '@/lib/pricing';
import { cn } from '@/lib/utils';

// =============================================================================
// TAB NAVIGATION
// =============================================================================

const TABS = [
  { id: 'membership', label: 'Membership', icon: Crown },
  { id: 'sellers', label: 'Sellers', icon: Store },
  { id: 'tickets', label: 'Ticket Resale', icon: Ticket },
  { id: 'venues', label: 'Venues', icon: Building2 },
  { id: 'advertising', label: 'Globe Ads', icon: Megaphone },
  { id: 'radio', label: 'Radio Ads', icon: Radio },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function Pricing() {
  const [activeTab, setActiveTab] = useState('membership');
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-hot-500/20 via-purple-500/10 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 pt-12 pb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            PRICING & <span className="text-transparent bg-clip-text bg-gradient-to-r from-hot-500 to-purple-500">PACKAGES</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Transparent pricing for users, sellers, venues, and advertisers. 
            No hidden fees. No surprises.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-3 hide-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all',
                    activeTab === tab.id
                      ? 'bg-hot-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'membership' && (
          <MembershipSection billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} />
        )}
        {activeTab === 'sellers' && <SellersSection />}
        {activeTab === 'tickets' && <TicketsSection />}
        {activeTab === 'venues' && <VenuesSection billingPeriod={billingPeriod} setBillingPeriod={setBillingPeriod} />}
        {activeTab === 'advertising' && <AdvertisingSection />}
        {activeTab === 'radio' && <RadioSection />}
      </div>
    </div>
  );
}

// =============================================================================
// MEMBERSHIP SECTION
// =============================================================================

function MembershipSection({ billingPeriod, setBillingPeriod }) {
  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              billingPeriod === 'monthly' ? 'bg-hot-500 text-white' : 'text-white/60'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
              billingPeriod === 'yearly' ? 'bg-hot-500 text-white' : 'text-white/60'
            )}
          >
            Yearly
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              Save 33%
            </span>
          </button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.values(MEMBERSHIP_TIERS).map((tier, index) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'relative rounded-2xl border-2 p-6 transition-all',
              tier.popular
                ? 'border-hot-500 bg-gradient-to-b from-hot-500/10 to-transparent scale-105'
                : tier.premium
                ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent'
                : 'border-white/10 bg-white/5'
            )}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-hot-500 text-white text-xs font-bold uppercase">
                Most Popular
              </div>
            )}
            {tier.premium && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold uppercase">
                Premium
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-black" style={{ color: tier.color }}>
                {tier.name}
              </h3>
              <p className="text-white/60 text-sm mt-1">{tier.tagline}</p>
              
              <div className="mt-4">
                <span className="text-4xl font-black">
                  {formatPrice(billingPeriod === 'yearly' ? tier.price.yearly : tier.price.monthly)}
                </span>
                {tier.price.monthly > 0 && (
                  <span className="text-white/40">
                    /{billingPeriod === 'yearly' ? 'year' : 'month'}
                  </span>
                )}
              </div>
              {billingPeriod === 'yearly' && tier.price.savings && (
                <p className="text-emerald-400 text-sm mt-1">Save {tier.price.savings}</p>
              )}
            </div>

            <ul className="space-y-3 mb-6">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-white/20 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={feature.included ? 'text-white/80' : 'text-white/30'}>
                    {feature.name}
                    {feature.limit && <span className="text-white/40"> ({feature.limit})</span>}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className={cn(
                'w-full py-3 rounded-xl font-bold transition-all',
                tier.id === 'free'
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : tier.premium
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400'
                  : 'bg-hot-500 text-white hover:bg-hot-600'
              )}
            >
              {tier.id === 'free' ? 'Current Plan' : `Upgrade to ${tier.name}`}
            </button>
          </motion.div>
        ))}
      </div>

      {/* XP Packages */}
      <div className="mt-12">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          XP Packages
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {XP_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                'p-4 rounded-xl border text-center',
                pkg.popular
                  ? 'border-hot-500 bg-hot-500/10'
                  : 'border-white/10 bg-white/5'
              )}
            >
              {pkg.popular && (
                <span className="text-xs bg-hot-500 text-white px-2 py-0.5 rounded-full">Popular</span>
              )}
              <p className="text-2xl font-bold mt-2">{pkg.xp.toLocaleString()}</p>
              <p className="text-white/40 text-xs">XP</p>
              {pkg.bonus > 0 && (
                <p className="text-emerald-400 text-xs mt-1">+{pkg.bonus * 100}% bonus</p>
              )}
              <p className="text-lg font-bold mt-2">{formatPrice(pkg.price)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SELLERS SECTION
// =============================================================================

function SellersSection() {
  const [salePrice, setSalePrice] = useState(50);

  return (
    <div className="space-y-8">
      {/* Commission Calculator */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-hot-500/10 border border-white/10">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-purple-400" />
          Commission Calculator
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-white/60 mb-2">Sale Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">£</span>
              <input
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-hot-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(MESSMARKET_SELLER.commission).map(([key, comm]) => {
              const earnings = calculateSellerEarnings(salePrice, comm.rate);
              return (
                <div key={key} className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                  <span className="text-sm capitalize">{key} ({comm.rate * 100}%)</span>
                  <span className="font-bold text-emerald-400">{formatPrice(earnings.earnings)} earnings</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seller Packages */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Store className="w-5 h-5 text-purple-400" />
          MESSMARKET Seller Packages
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(MESSMARKET_SELLER.packages).map((pkg, index) => (
            <div
              key={pkg.id}
              className={cn(
                'rounded-2xl border p-6',
                pkg.popular
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-white/10 bg-white/5'
              )}
            >
              {pkg.popular && (
                <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">Popular</span>
              )}
              <h4 className="text-xl font-bold mt-2">{pkg.name}</h4>
              <div className="mt-2">
                {pkg.price === 0 ? (
                  <span className="text-2xl font-bold">Free</span>
                ) : (
                  <>
                    <span className="text-2xl font-bold">{formatPrice(pkg.price.monthly)}</span>
                    <span className="text-white/40">/month</span>
                  </>
                )}
              </div>
              <ul className="mt-4 space-y-2">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full mt-6 py-3 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition-all">
                {pkg.price === 0 ? 'Start Selling' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Buyer Info */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          Buyer Costs
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Check className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="font-bold">No Platform Fees</p>
            <p className="text-sm text-white/60">The listed price is what you pay. No hidden charges.</p>
          </div>
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Shield className="w-6 h-6 text-cyan-400 mb-2" />
            <p className="font-bold">Buyer Protection Included</p>
            <p className="text-sm text-white/60">Escrow payment, refund guarantee, 14-day disputes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TICKETS SECTION
// =============================================================================

function TicketsSection() {
  const [ticketPrice, setTicketPrice] = useState(75);
  const [faceValue, setFaceValue] = useState(50);

  const fees = calculateTicketFees(ticketPrice, faceValue);

  return (
    <div className="space-y-8">
      {/* Fee Calculator */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-white/10">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-400" />
          Ticket Fee Calculator
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-white/60 mb-2">Face Value</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">£</span>
              <input
                type="number"
                value={faceValue}
                onChange={(e) => setFaceValue(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-2">Your Listing Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">£</span>
              <input
                type="number"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 focus:border-amber-500 focus:outline-none"
              />
            </div>
            {!fees.withinPriceCap && (
              <p className="text-red-400 text-xs mt-1">Exceeds 150% price cap</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-sm text-white/60">Your Earnings (10% fee)</span>
              <span className="font-bold text-emerald-400">{formatPrice(fees.sellerEarnings)}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-sm text-white/60">Buyer Pays (2.5% fee)</span>
              <span className="font-bold">{formatPrice(fees.buyerTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h4 className="font-bold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-400" />
            Seller Fees
          </h4>
          <ul className="space-y-3">
            <li className="flex justify-between">
              <span className="text-white/60">Listing Fee</span>
              <span className="font-bold text-emerald-400">Free</span>
            </li>
            <li className="flex justify-between">
              <span className="text-white/60">Platform Commission</span>
              <span className="font-bold">10%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-white/60">Verified Seller</span>
              <span className="font-bold">8%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-white/60">Professional Seller</span>
              <span className="font-bold">6%</span>
            </li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <h4 className="font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Buyer Fees
          </h4>
          <ul className="space-y-3">
            <li className="flex justify-between">
              <span className="text-white/60">Service Fee</span>
              <span className="font-bold">2.5%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-white/60">Min Fee</span>
              <span className="font-bold">{formatPrice(0.99)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-white/60">Max Fee</span>
              <span className="font-bold">{formatPrice(14.99)}</span>
            </li>
          </ul>
          <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-sm text-cyan-400 font-medium">✓ Ticket Guarantee Included</p>
            <p className="text-xs text-white/60 mt-1">Full refund if invalid or event cancelled</p>
          </div>
        </div>
      </div>

      {/* Price Cap Notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 mt-0.5" />
        <div>
          <p className="font-medium text-amber-400">Anti-Scalping Price Cap</p>
          <p className="text-sm text-white/60 mt-1">
            Tickets cannot be listed above 150% of face value to prevent excessive scalping 
            and keep events accessible to the community.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VENUES SECTION
// =============================================================================

function VenuesSection({ billingPeriod, setBillingPeriod }) {
  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              billingPeriod === 'monthly' ? 'bg-cyan-500 text-white' : 'text-white/60'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              billingPeriod === 'yearly' ? 'bg-cyan-500 text-white' : 'text-white/60'
            )}
          >
            Yearly (2 months free)
          </button>
        </div>
      </div>

      {/* Venue Packages */}
      <div className="grid md:grid-cols-4 gap-4">
        {Object.values(VENUE_PACKAGES).map((pkg, index) => (
          <div
            key={pkg.id}
            className={cn(
              'rounded-2xl border p-5',
              pkg.popular
                ? 'border-cyan-500 bg-cyan-500/10'
                : 'border-white/10 bg-white/5'
            )}
          >
            {pkg.popular && (
              <span className="text-xs bg-cyan-500 text-white px-2 py-0.5 rounded-full">Popular</span>
            )}
            <h4 className="text-lg font-bold mt-2">{pkg.name}</h4>
            <div className="mt-2">
              {pkg.price === 0 ? (
                <span className="text-2xl font-bold">Free</span>
              ) : pkg.contactSales ? (
                <span className="text-xl font-bold text-cyan-400">Contact Sales</span>
              ) : (
                <>
                  <span className="text-2xl font-bold">
                    {formatPrice(billingPeriod === 'yearly' ? pkg.price.yearly : pkg.price.monthly)}
                  </span>
                  <span className="text-white/40 text-sm">/{billingPeriod === 'yearly' ? 'yr' : 'mo'}</span>
                </>
              )}
            </div>

            {pkg.globe?.visible && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400">
                  {pkg.globe.pinStyle === 'animated' ? 'Animated Globe pin' : 'Globe visibility'}
                </span>
              </div>
            )}

            <ul className="mt-4 space-y-2">
              {pkg.features.slice(0, 6).map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <Check className="w-3 h-3 text-emerald-400 mt-0.5" />
                  <span className="text-white/70">{feature}</span>
                </li>
              ))}
              {pkg.features.length > 6 && (
                <li className="text-xs text-white/40">+{pkg.features.length - 6} more features</li>
              )}
            </ul>

            <button className="w-full mt-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-bold hover:bg-cyan-600 transition-all">
              {pkg.contactSales ? 'Contact Sales' : pkg.price === 0 ? 'Get Started' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ADVERTISING SECTION
// =============================================================================

function AdvertisingSection() {
  return (
    <div className="space-y-8">
      {/* Globe Beacons */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-hot-500" />
          Globe Beacon Advertising
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(GLOBE_ADVERTISING.beacons).map((beacon, index) => (
            <div
              key={beacon.name}
              className={cn(
                'rounded-2xl border p-6',
                beacon.popular
                  ? 'border-hot-500 bg-hot-500/10'
                  : 'border-white/10 bg-white/5'
              )}
            >
              {beacon.popular && (
                <span className="text-xs bg-hot-500 text-white px-2 py-0.5 rounded-full">Popular</span>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div 
                  className={cn(
                    'w-8 h-8 rounded-full',
                    beacon.visual.glow ? 'bg-hot-500 shadow-lg shadow-hot-500/50' : 'bg-white/20'
                  )}
                />
                <h4 className="font-bold">{beacon.name}</h4>
              </div>
              <p className="text-sm text-white/60 mt-2">{beacon.description}</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Daily</span>
                  <span className="font-bold">{formatPrice(beacon.price.daily)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Weekly</span>
                  <span className="font-bold">{formatPrice(beacon.price.weekly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Monthly</span>
                  <span className="font-bold">{formatPrice(beacon.price.monthly)}</span>
                </div>
              </div>

              <ul className="mt-4 space-y-1">
                {beacon.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                    <Check className="w-3 h-3 text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <button className="w-full mt-4 py-2 rounded-lg bg-hot-500 text-white font-bold hover:bg-hot-600 transition-all">
                Book Beacon
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Banner Ads */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-400" />
          Banner Advertising
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.values(GLOBE_ADVERTISING.banners).slice(0, 4).map((banner) => (
            <div key={banner.name} className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
              <div>
                <h4 className="font-bold">{banner.name}</h4>
                <p className="text-xs text-white/60">{banner.description}</p>
                {banner.impressions && (
                  <p className="text-xs text-cyan-400 mt-1">{banner.impressions}</p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold">{formatPrice(banner.price.daily)}<span className="text-white/40 text-sm">/day</span></p>
                <p className="text-sm text-white/60">{formatPrice(banner.price.weekly)}/week</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsored Content */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" />
          Sponsored Placements
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(GLOBE_ADVERTISING.sponsored).map((item) => (
            <div key={item.name} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-bold">{item.name}</h4>
              <p className="text-xs text-white/60 mt-1">{item.description}</p>
              {item.price.daily && (
                <p className="text-lg font-bold mt-3">
                  {formatPrice(item.price.daily)}<span className="text-white/40 text-sm">/day</span>
                </p>
              )}
              {item.price.perNotification && (
                <p className="text-lg font-bold mt-3">
                  {formatPrice(item.price.perNotification)}<span className="text-white/40 text-sm">/notification</span>
                  <span className="block text-xs text-white/40">Min: {item.price.minCampaign}</span>
                </p>
              )}
              {item.features && (
                <ul className="mt-3 space-y-1">
                  {item.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                      <Check className="w-3 h-3 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// RADIO ADVERTISING SECTION
// =============================================================================

function RadioSection() {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-hot-500/20 via-purple-500/10 to-cyan-500/10 border border-hot-500/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-hot-500/20 flex items-center justify-center">
            <Radio className="w-8 h-8 text-hot-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black">HOTMESS RADIO</h3>
            <p className="text-white/60">24/7 Underground Music • Global LGBTQ+ Audience</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-hot-500">100K+</p>
            <p className="text-xs text-white/60">Monthly Listeners</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-cyan-400">50+</p>
            <p className="text-xs text-white/60">Weekly Shows</p>
          </div>
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-2xl font-bold text-purple-400">85%</p>
            <p className="text-xs text-white/60">Listener Engagement</p>
          </div>
        </div>
      </div>

      {/* Sponsorship Packages */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400" />
          Sponsorship Packages
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(RADIO_ADVERTISING.sponsorship).map((pkg, index) => (
            <div
              key={pkg.name}
              className={cn(
                'rounded-2xl border p-6',
                index === 2 ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5'
              )}
            >
              {index === 2 && (
                <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold">Premier</span>
              )}
              <h4 className="text-lg font-bold mt-2">{pkg.name}</h4>
              <p className="text-sm text-white/60 mt-1">{pkg.description}</p>
              
              <div className="mt-4 space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Weekly</span>
                  <span className="font-bold">{formatPrice(pkg.price.weekly)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">Monthly</span>
                  <span className="font-bold">{formatPrice(pkg.price.monthly)}</span>
                </div>
                {pkg.price.quarterly && (
                  <div className="flex justify-between">
                    <span className="text-white/60 text-sm">Quarterly</span>
                    <span className="font-bold text-emerald-400">{formatPrice(pkg.price.quarterly)}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-cyan-400 mt-3">{pkg.reach}</p>

              <ul className="mt-4 space-y-1">
                {pkg.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Check className="w-3 h-3 text-emerald-400 mt-0.5" />
                    <span className="text-white/70">{f}</span>
                  </li>
                ))}
                {pkg.features.length > 5 && (
                  <li className="text-xs text-white/40">+{pkg.features.length - 5} more features</li>
                )}
              </ul>

              <button className="w-full mt-4 py-2 rounded-lg bg-hot-500 text-white font-bold hover:bg-hot-600 transition-all">
                Get Quote
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ad Spots */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-cyan-400" />
          Audio Ad Spots
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(RADIO_ADVERTISING.adSpots).map((spot) => (
            <div 
              key={spot.name}
              className={cn(
                'p-4 rounded-xl border',
                spot.premium ? 'border-hot-500 bg-hot-500/10' : 'border-white/10 bg-white/5'
              )}
            >
              {spot.premium && (
                <span className="text-xs bg-hot-500 text-white px-2 py-0.5 rounded-full">Premium</span>
              )}
              <h4 className="font-bold mt-2">{spot.name}</h4>
              <p className="text-xs text-white/60">{spot.duration}</p>
              <p className="text-sm text-white/60 mt-1">{spot.description}</p>
              
              <div className="mt-3 space-y-1 text-sm">
                {spot.price.perPlay && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Per play</span>
                    <span className="font-bold">{formatPrice(spot.price.perPlay)}</span>
                  </div>
                )}
                {spot.price.perRead && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Per read</span>
                    <span className="font-bold">{formatPrice(spot.price.perRead)}</span>
                  </div>
                )}
                {spot.price.package100 && (
                  <div className="flex justify-between">
                    <span className="text-white/60">100 pack</span>
                    <span className="font-bold text-emerald-400">{formatPrice(spot.price.package100)}</span>
                  </div>
                )}
                {spot.price.package5 && (
                  <div className="flex justify-between">
                    <span className="text-white/60">5 pack</span>
                    <span className="font-bold text-emerald-400">{formatPrice(spot.price.package5)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Placements */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Special Placements
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(RADIO_ADVERTISING.specialPlacements).map((placement) => (
            <div key={placement.name} className="p-5 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-bold">{placement.name}</h4>
              <p className="text-sm text-white/60 mt-1">{placement.description}</p>
              
              <div className="mt-3 space-y-1">
                {placement.price.hourly && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Hourly</span>
                    <span className="font-bold">{formatPrice(placement.price.hourly)}</span>
                  </div>
                )}
                {placement.price.halfDay && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Half Day</span>
                    <span className="font-bold">{formatPrice(placement.price.halfDay)}</span>
                  </div>
                )}
                {placement.price.fullDay && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Full Day</span>
                    <span className="font-bold text-emerald-400">{formatPrice(placement.price.fullDay)}</span>
                  </div>
                )}
                {placement.price.perEvent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Per Event</span>
                    <span className="font-bold">{formatPrice(placement.price.perEvent)}</span>
                  </div>
                )}
                {placement.price.perEpisode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Per Episode</span>
                    <span className="font-bold">{formatPrice(placement.price.perEpisode)}</span>
                  </div>
                )}
              </div>

              {placement.features && (
                <ul className="mt-3 space-y-1">
                  {placement.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-white/70">
                      <Check className="w-3 h-3 text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Production Services */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Mic className="w-5 h-5 text-hot-500" />
          Production Services
          <span className="text-xs bg-hot-500/20 text-hot-400 px-2 py-0.5 rounded-full ml-2">
            by SMASH DADDYS
          </span>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(RADIO_ADVERTISING.production).map((service) => (
            <div key={service.name} className="p-5 rounded-xl bg-gradient-to-br from-hot-500/10 to-purple-500/10 border border-hot-500/30">
              <h4 className="font-bold">{service.name}</h4>
              <p className="text-sm text-white/60 mt-1">{service.description}</p>
              
              {service.tiers ? (
                <div className="mt-3 space-y-2">
                  {Object.entries(service.tiers).map(([tier, desc]) => (
                    <div key={tier} className="p-2 rounded bg-white/5">
                      <div className="flex justify-between">
                        <span className="text-sm capitalize">{tier}</span>
                        <span className="font-bold">{formatPrice(service.price[tier])}</span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  {service.price.thirtySecond && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">30 sec</span>
                      <span className="font-bold">{formatPrice(service.price.thirtySecond)}</span>
                    </div>
                  )}
                  {service.price.sixtySecond && (
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">60 sec</span>
                      <span className="font-bold">{formatPrice(service.price.sixtySecond)}</span>
                    </div>
                  )}
                  {typeof service.price === 'number' && (
                    <p className="text-lg font-bold mt-2">{formatPrice(service.price)}</p>
                  )}
                </div>
              )}

              {service.turnaround && (
                <p className="text-xs text-cyan-400 mt-3">Turnaround: {service.turnaround}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bundle Packages */}
      <div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Radio Ad Bundles
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {Object.values(RADIO_ADVERTISING.packages).map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                'rounded-2xl border p-6',
                pkg.popular
                  ? 'border-hot-500 bg-hot-500/10 scale-105'
                  : 'border-white/10 bg-white/5'
              )}
            >
              {pkg.popular && (
                <span className="text-xs bg-hot-500 text-white px-2 py-0.5 rounded-full">Best Value</span>
              )}
              <h4 className="text-xl font-bold mt-2">{pkg.name}</h4>
              <p className="text-sm text-white/60 mt-1">{pkg.description}</p>
              
              <div className="mt-4">
                <span className="text-3xl font-black">{formatPrice(pkg.price)}</span>
                {pkg.savings && (
                  <span className="ml-2 text-emerald-400 text-sm">Save {pkg.savings}</span>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {pkg.includes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <span className="text-white/80">{item}</span>
                  </li>
                ))}
              </ul>

              <button className={cn(
                'w-full mt-6 py-3 rounded-xl font-bold transition-all',
                pkg.popular
                  ? 'bg-hot-500 text-white hover:bg-hot-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Targeting Options */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cyan-400" />
          Targeting Options
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Object.values(RADIO_ADVERTISING.targeting).map((target) => (
            <div key={target.name} className="p-4 rounded-lg bg-white/5">
              <h4 className="font-medium">{target.name}</h4>
              <p className="text-xs text-white/60 mt-1">{target.description}</p>
              {target.surcharge > 0 && (
                <p className="text-xs text-amber-400 mt-2">+{target.surcharge * 100}% premium</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {target.options.map((opt) => (
                  <span key={opt} className="text-xs px-2 py-0.5 rounded bg-white/10">
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
