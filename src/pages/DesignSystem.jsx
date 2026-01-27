import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { 
  ScrollReveal, 
  ScrollStagger,
  HeroCTA,
  QuickActionBar,
  FloatingAction,
  LuxModal,
  LuxConfirm,
  LuxActionSheet,
  SwipeableView,
  CornerTear,
} from '@/components/lux';
import { Zap, Heart, MapPin, Users, Calendar, ArrowRight } from 'lucide-react';

/**
 * LUX BRUTALIST Design System Showcase
 * Chrome Luxury Design Language
 */
export default function DesignSystem() {
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      {/* Hero Section with Chrome Gradient */}
      <section 
        className="min-h-screen flex flex-col items-center justify-center text-center p-6"
        style={{
          background: 'radial-gradient(ellipse 150% 100% at 50% 30%, #E62020 0%, #8B0000 20%, #4d0000 40%, #1a0000 55%, #0D0D0D 85%)'
        }}
      >
        <ScrollReveal direction="up">
          {/* Wordmark */}
          <h1 
            className="text-6xl md:text-8xl lg:text-[10rem] font-black italic uppercase tracking-[-0.02em] leading-[0.85] mb-4"
            style={{
              background: 'linear-gradient(90deg, #8B0000 0%, #E62020 20%, #E62020 40%, #E5A820 55%, rgba(250,250,250,0.4) 75%, rgba(250,250,250,0.2) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            HOTMESS
          </h1>
          
          {/* Tagline */}
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-white/50 mb-8">
            Always too much, yet never enough
          </p>

          {/* Power words */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="text-lg sm:text-2xl font-black uppercase tracking-wider">BRUTAL</span>
            <span className="w-1.5 h-1.5 bg-white/60" />
            <span className="text-lg sm:text-2xl font-black uppercase tracking-wider">CHROME</span>
            <span className="w-1.5 h-1.5 bg-white/60" />
            <span className="text-lg sm:text-2xl font-black uppercase tracking-wider">POWER</span>
          </div>

          <p className="text-sm text-white/60 max-w-md mx-auto mb-10">
            Complete brand system with logos, gradients, typography, animations, and accessibility-compliant design tokens.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="luxPrimary" size="lg">View Documentation</Button>
            <Button variant="luxSecondary" size="lg">Explore Assets</Button>
          </div>
        </ScrollReveal>
      </section>

      {/* Main Content */}
      <div className="p-6 md:p-12">

      {/* Color System */}
      <section className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black italic uppercase text-center mb-2">COLOR SYSTEM</h2>
        <div className="w-full h-[3px] bg-[#E62020] mb-12" />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="aspect-[4/3] bg-[#0D0D0D] border border-white/10 mb-4" />
            <p className="font-semibold uppercase tracking-wider mb-1">INK</p>
            <p className="text-xs text-white/40 uppercase tracking-wider">0 0% 5%</p>
          </div>
          <div className="text-center">
            <div className="aspect-[4/3] bg-[#FAFAFA] mb-4" />
            <p className="font-semibold uppercase tracking-wider mb-1">PAPER</p>
            <p className="text-xs text-white/40 uppercase tracking-wider">0 0% 98%</p>
          </div>
          <div className="text-center">
            <div className="aspect-[4/3] bg-[#E62020] mb-4" />
            <p className="font-semibold uppercase tracking-wider mb-1">ACCENT</p>
            <p className="text-xs text-white/40 uppercase tracking-wider">0 85% 55%</p>
          </div>
          <div className="text-center">
            <div className="aspect-[4/3] bg-[#E5A820] mb-4" />
            <p className="font-semibold uppercase tracking-wider mb-1">GOLD</p>
            <p className="text-xs text-white/40 uppercase tracking-wider">45 90% 55%</p>
          </div>
        </div>
      </section>

      {/* Gradients */}
      <section className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black italic uppercase text-center mb-2">GRADIENTS</h2>
        <div className="w-full h-[3px] bg-[#E62020] mb-12" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div 
              className="aspect-[4/3] mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1a0000 0%, #0D0D0D 30%, #E62020 100%)' }}
            >
              <span className="text-sm uppercase tracking-widest text-white/80">HOTMESS</span>
            </div>
            <p className="font-semibold uppercase tracking-wider">CHROME RED</p>
          </div>
          <div className="text-center">
            <div 
              className="aspect-[4/3] mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(180deg, #E5A820 0%, #8B6914 60%, #3d2e0a 100%)' }}
            >
              <span className="text-sm uppercase tracking-widest text-white/80">GOLD</span>
            </div>
            <p className="font-semibold uppercase tracking-wider">GOLD FADE</p>
          </div>
          <div className="text-center">
            <div 
              className="aspect-[4/3] mb-4 flex items-center justify-center"
              style={{ background: 'radial-gradient(ellipse at center, #E62020 0%, #8B0000 30%, #1a0000 60%, #0D0D0D 100%)' }}
            >
              <span className="text-sm uppercase tracking-widest text-[#E62020]">RADIAL</span>
            </div>
            <p className="font-semibold uppercase tracking-wider">SPOTLIGHT</p>
          </div>
        </div>
      </section>

      {/* Typography System */}
      <section className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black italic uppercase text-center mb-2">TYPOGRAPHY SYSTEM</h2>
        <div className="w-full h-[3px] bg-[#E62020] mb-12" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display Scale */}
          <div className="border-2 border-white/20 p-6 md:p-8">
            <h3 className="text-xl font-black italic uppercase text-[#E62020] mb-6">DISPLAY SCALE</h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">H1 - HERO</p>
                <p className="text-5xl md:text-6xl font-black italic uppercase leading-none">POWER</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">H2 - SECTION</p>
                <p className="text-3xl md:text-4xl font-black italic uppercase leading-none">CONVICTION</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">H3 - SUBSECTION</p>
                <p className="text-2xl font-bold uppercase leading-none">BRUTALISM</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-1">H4 - CARD TITLE</p>
                <p className="text-lg font-bold uppercase tracking-wide leading-none">CHROME LUXURY</p>
              </div>
            </div>
          </div>

          {/* Body Scale */}
          <div className="border-2 border-white/20 p-6 md:p-8">
            <h3 className="text-xl font-black uppercase mb-6">BODY SCALE</h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">BODY LARGE</p>
                <p className="text-lg leading-relaxed text-white/90">Brutalist luxury editorial platform combining live radio, commerce, and AI culture.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">BODY</p>
                <p className="text-base leading-relaxed text-white/80">Raw typographic scale with monochrome base and tactical texture. Strong kinetic motion.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">BODY SMALL</p>
                <p className="text-sm leading-relaxed text-white/70">Editorial grid layout with tactile texture and audio-reactive visual cues.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">LABEL</p>
                <p className="text-xs uppercase tracking-[0.15em] text-white/50">UPPERCASE LABEL TEXT</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Buttons & Controls */}
      <section className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black italic uppercase text-center mb-2">BUTTONS & CONTROLS</h2>
        <div className="w-full h-[3px] bg-[#E62020] mb-12" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary */}
          <div className="border-2 border-white/20 p-8 text-center">
            <h3 className="text-xl font-black uppercase text-[#E62020] mb-6">PRIMARY</h3>
            <Button variant="luxPrimary" size="lg" className="mb-4">ENTER</Button>
            <p className="text-sm text-white/50">Brutalist outline, fills on hover</p>
          </div>

          {/* Secondary */}
          <div className="border-2 border-white/20 p-8 text-center">
            <h3 className="text-xl font-black uppercase mb-6">SECONDARY</h3>
            <Button variant="luxSecondary" size="lg" className="mb-4">SHOP NOW</Button>
            <p className="text-sm text-white/50">Gold filled, outlines on hover</p>
          </div>

          {/* Tertiary */}
          <div className="border-2 border-white/20 p-8 text-center">
            <h3 className="text-xl font-black uppercase mb-6">TERTIARY</h3>
            <Button variant="luxTertiary" size="lg" className="mb-4">LEARN MORE</Button>
            <p className="text-sm text-white/50">Ghost style, subtle hover</p>
          </div>
        </div>
      </section>

      {/* Animations */}
      <section className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black italic uppercase text-center mb-2">ANIMATIONS</h2>
        <div className="w-full h-[3px] bg-[#E62020] mb-12" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pulse Glow */}
          <div className="border-2 border-white/20 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div 
                className="w-12 h-12 bg-[#E62020] animate-lux-pulse"
                style={{ boxShadow: '0 0 30px rgba(230,32,32,0.6)' }}
              />
            </div>
            <h3 className="text-xl font-black uppercase mb-2">PULSE GLOW</h3>
            <p className="text-sm text-white/50">Live indicators</p>
          </div>

          {/* Audio Pulse */}
          <div className="border-2 border-white/20 p-8 text-center">
            <div className="flex justify-center items-end gap-1 h-12 mb-6">
              {[1,2,3,4,5].map((i) => (
                <div 
                  key={i}
                  className="w-2 bg-[#E62020]"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animation: `lux-audio-bar 0.8s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <h3 className="text-xl font-black uppercase mb-2">AUDIO PULSE</h3>
            <p className="text-sm text-white/50">Waveform reactive</p>
          </div>

          {/* Marquee */}
          <div className="border-2 border-white/20 p-8 text-center overflow-hidden">
            <div className="mb-6 overflow-hidden">
              <div className="whitespace-nowrap animate-lux-marquee text-sm tracking-widest">
                <span className="text-[#39FF14] mx-4">LIVE</span>
                <span className="text-white/30">•</span>
                <span className="text-[#E62020] mx-4">HOTMESS</span>
                <span className="text-white/30">•</span>
                <span className="text-white mx-4">LIVE</span>
                <span className="text-white/30">•</span>
              </div>
            </div>
            <h3 className="text-xl font-black uppercase mb-2">MARQUEE</h3>
            <p className="text-sm text-white/50">Infinite scroll</p>
          </div>
        </div>
      </section>

      {/* Patterns */}
      <section className="mb-20">
        <h2 className="text-4xl md:text-5xl font-black italic uppercase text-center mb-2">PATTERNS</h2>
        <div className="w-full h-[3px] bg-[#E62020] mb-12" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div 
              className="aspect-[4/3] border border-white/20 mb-4"
              style={{
                backgroundImage: 'linear-gradient(rgba(250,250,250,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(250,250,250,0.1) 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }}
            />
            <p className="font-semibold uppercase tracking-wider">BRUTALIST GRID</p>
          </div>
          <div className="text-center">
            <div 
              className="aspect-[4/3] border border-white/20 mb-4"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(250,250,250,0.05) 10px, rgba(250,250,250,0.05) 11px)'
              }}
            />
            <p className="font-semibold uppercase tracking-wider">DIAGONAL LINES</p>
          </div>
          <div className="text-center">
            <div 
              className="aspect-[4/3] border border-white/20 mb-4"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(250,250,250,0.15) 1px, transparent 1px)',
                backgroundSize: '16px 16px'
              }}
            />
            <p className="font-semibold uppercase tracking-wider">DOTS</p>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
          // BADGES
        </h2>
        <div className="flex flex-wrap gap-4">
          <Badge variant="default">Default</Badge>
          <Badge variant="ledHot">LED Hot</Badge>
          <Badge variant="ledLive" withDot>LED Live</Badge>
          <Badge variant="ledSolidHot">Solid Hot</Badge>
          <Badge variant="ledSolidLive">Solid Live</Badge>
          <Badge variant="online">Online</Badge>
          <Badge variant="offline">Offline</Badge>
          <Badge variant="away">Away</Badge>
          <Badge variant="destructive">Error</Badge>
        </div>
      </section>

      {/* Input */}
      <section className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
          // INPUTS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-2 border-white/20 p-6">
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">Default Input</p>
            <Input placeholder="Enter your username" />
          </div>
          <div className="border-2 border-white/20 p-6">
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">With Label</p>
            <label className="block font-mono text-xs uppercase tracking-wider mb-2 text-white/60">
              Username
            </label>
            <Input placeholder="@handle" />
          </div>
          <div className="border-2 border-white/20 p-6">
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">Disabled</p>
            <Input placeholder="Not available" disabled />
          </div>
          <div className="border-2 border-white/20 p-6">
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">Search</p>
            <Input type="search" placeholder="Search the grid..." />
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
          // CARDS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Standard container</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm text-white/70">
                Content goes here with LED Brutalist styling.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ledSecondary" size="sm">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="hot">
            <CardHeader>
              <CardTitle>Hot Card</CardTitle>
              <CardDescription>Highlighted content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm text-white/70">
                LED Hot pink glow border for emphasis.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ledPrimary" size="sm">Connect</Button>
            </CardFooter>
          </Card>

          <Card variant="live">
            <CardHeader>
              <Badge variant="ledLive" withDot className="mb-2">Live Now</Badge>
              <CardTitle>Live Card</CardTitle>
              <CardDescription>Active/online state</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm text-white/70">
                LED Live green glow for active elements.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="ledLive" size="sm">Join</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Dividers */}
      <section className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
          // DIVIDERS
        </h2>
        <div className="space-y-8 border-2 border-white/20 p-6">
          <div>
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">Standard</p>
            <div className="h-[1px] bg-white/20" />
          </div>
          <div>
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">LED Hot</p>
            <div 
              className="h-[2px] bg-[#E62020]"
              style={{ boxShadow: '0 0 10px rgba(255,20,147,0.5)' }}
            />
          </div>
          <div>
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">LED Fade</p>
            <div 
              className="h-[1px]"
              style={{ 
                background: 'linear-gradient(90deg, transparent, #E62020, transparent)',
                boxShadow: '0 0 10px rgba(255,20,147,0.3)'
              }}
            />
          </div>
          <div>
            <p className="font-mono text-[10px] text-white/40 uppercase mb-4">Double Line</p>
            <div className="space-y-1">
              <div className="h-[2px] bg-white" />
              <div className="h-[2px] bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Profile Card Example */}
      <section className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
          // PROFILE CARD EXAMPLE
        </h2>
        <div className="max-w-sm">
          <Card variant="hot">
            {/* Image area */}
            <div className="aspect-[4/5] bg-gradient-to-br from-gray-900 to-black relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-white/20 text-sm">[ IMAGE ]</span>
              </div>
              {/* Status badge */}
              <div className="absolute top-3 left-3">
                <Badge variant="ledLive" withDot>Online</Badge>
              </div>
              {/* Match score */}
              <div className="absolute top-3 right-3">
                <span 
                  className="font-mono text-4xl font-black text-[#E62020]"
                  style={{ textShadow: '0 0 20px rgba(255,20,147,0.8)' }}
                >
                  94<span className="text-lg">%</span>
                </span>
              </div>
            </div>
            
            {/* Info */}
            <CardContent className="pt-4">
              <h3 className="font-mono font-bold text-xl uppercase tracking-wider mb-1">
                ALEX, 28
              </h3>
              <p className="font-mono text-xs text-white/50 uppercase tracking-wider mb-4">
                SHOREDITCH • 2.4 KM
              </p>
              
              {/* Data rows */}
              <div className="space-y-2">
                <div className="flex justify-between font-mono text-[10px] uppercase">
                  <span className="text-white/40">Vibe</span>
                  <span className="text-[#E62020]">Club Kid</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] uppercase">
                  <span className="text-white/40">Looking For</span>
                  <span>Right Now</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="gap-3">
              <Button variant="ledSecondary" size="sm" className="flex-1">Skip</Button>
              <Button variant="ledSolidHot" size="sm" className="flex-1">Connect</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Hero CTA Section */}
      <ScrollReveal direction="up">
        <section className="mb-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
            // HERO CALL-TO-ACTION
          </h2>
          <HeroCTA
            headline="FIND YOUR PEOPLE TONIGHT"
            subheadline="Real-time connections. No bullshit. Just the scene as it happens."
            primaryAction={{ label: 'GO LIVE', href: '/Connect' }}
            secondaryAction={{ label: 'EXPLORE', href: '/Pulse' }}
          />
        </section>
      </ScrollReveal>

      {/* Quick Actions */}
      <ScrollReveal direction="up">
        <section className="mb-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
            // QUICK ACTIONS
          </h2>
          <QuickActionBar
            actions={[
              { type: 'connect', label: 'Match', active: true, badge: '3' },
              { type: 'discover', label: 'Discover' },
              { type: 'nearby', label: 'Nearby' },
              { type: 'social', label: 'Social' },
              { type: 'events', label: 'Events' },
            ]}
          />
        </section>
      </ScrollReveal>

      {/* Interactive Elements */}
      <ScrollReveal direction="up">
        <section className="mb-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
            // MODALS & OVERLAYS
          </h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="ledPrimary" onClick={() => setShowModal(true)}>
              Open Modal
            </Button>
            <Button variant="ledSecondary" onClick={() => setShowConfirm(true)}>
              Confirm Dialog
            </Button>
            <Button variant="ledLive" onClick={() => setShowActionSheet(true)}>
              Action Sheet
            </Button>
          </div>
        </section>
      </ScrollReveal>

      {/* Corner Tear Demo */}
      <ScrollReveal direction="up">
        <section className="mb-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
            // CORNER TEAR INTERACTION
          </h2>
          <div className="relative border-2 border-white/30 p-8 h-48">
            <p className="font-mono text-sm text-white/60 uppercase">
              Drag the corner to "tear" and dismiss
            </p>
            <CornerTear 
              position="bottom-right" 
              onTear={() => alert('Torn!')} 
            />
          </div>
        </section>
      </ScrollReveal>

      {/* Scroll Stagger Demo */}
      <section className="mb-16">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
          // STAGGERED REVEAL
        </h2>
        <ScrollStagger staggerDelay={0.1} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-2 border-white/20 p-6 text-center">
              <span className="font-mono text-2xl font-bold">{i}</span>
            </div>
          ))}
        </ScrollStagger>
      </section>

      {/* Page Flow Demo */}
      <ScrollReveal direction="up">
        <section className="mb-16">
          <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-white/40 mb-6 border-b border-white/10 pb-2">
            // PAGE FLOWS
          </h2>
          <div className="border-2 border-white/20 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 border-2 border-[#E62020] flex items-center justify-center font-mono text-sm">1</div>
              <div className="flex-1 h-[2px] bg-gradient-to-r from-[#E62020] to-white/20" />
              <div className="w-12 h-12 border-2 border-white/30 flex items-center justify-center font-mono text-sm text-white/50">2</div>
              <div className="flex-1 h-[2px] bg-white/20" />
              <div className="w-12 h-12 border-2 border-white/30 flex items-center justify-center font-mono text-sm text-white/50">3</div>
            </div>
            <div className="space-y-2 font-mono text-xs uppercase tracking-wider">
              <p className="text-[#E62020]">1. AGE GATE → CONSENT</p>
              <p className="text-white/40">2. PROFILE SETUP → PREFERENCES</p>
              <p className="text-white/40">3. DISCOVER → CONNECT</p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Close main content div */}
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-white/20 p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-white/40 uppercase tracking-wider">
              HOTMESS Global Operating System
            </p>
            <p className="text-xs text-white/20 uppercase tracking-wider">
              Chrome Luxury Brutalist v3.0
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="luxPrimary" size="sm">Documentation</Button>
            <Button variant="luxSecondary" size="sm">Assets</Button>
          </div>
        </div>
      </footer>

      {/* Floating Action Button Demo */}
      <FloatingAction 
        icon={Heart}
        label="MATCH"
        href="/Connect"
        pulse
      />

      {/* Modals */}
      <LuxModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="LUX MODAL"
        subtitle="Shutter transition with corner tear"
      >
        <div className="space-y-4">
          <p className="font-mono text-sm text-white/70 uppercase leading-relaxed">
            This modal uses the shutter entrance animation. Drag the bottom-right corner to dismiss, or click the X button.
          </p>
          <Button variant="ledPrimary" className="w-full" onClick={() => setShowModal(false)}>
            GOT IT
          </Button>
        </div>
      </LuxModal>

      <LuxConfirm
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => { /* Demo action confirmed */ }}
        title="CONFIRM ACTION"
        message="Are you sure you want to proceed? This action demonstrates the LUX confirmation dialog pattern."
        confirmText="YES, PROCEED"
        cancelText="CANCEL"
      />

      <LuxActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        title="QUICK ACTIONS"
        actions={[
          { id: 'share', label: 'Share Profile', icon: '◎', variant: 'primary' },
          { id: 'report', label: 'Report User', icon: '⚠', variant: 'danger' },
          { id: 'block', label: 'Block User', icon: '✕' },
          { id: 'cancel', label: 'Cancel' },
        ]}
      />
    </div>
  );
}
