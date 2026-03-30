import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../../Layout';
import PersistentRadioPlayer from './PersistentRadioPlayer';

// Import all pages
import Home from '../../pages/Home';
import Globe from '../../pages/Globe';
import Connect from '../../pages/Connect';
import Marketplace from '../../pages/Marketplace';
import Profile from '../../pages/Profile';
import BeaconDetail from '../../pages/BeaconDetail';
import Settings from '../../pages/Settings';
import Messages from '../../pages/Messages';
import Challenges from '../../pages/Challenges';
import Safety from '../../pages/Safety';
import Feed from '../../pages/Feed';
import Stats from '../../pages/Stats';
import Events from '../../pages/Events';
import Leaderboard from '../../pages/Leaderboard';
import AccountConsents from '../../pages/AccountConsents';
import OnboardingGate from '../../pages/OnboardingGate';
import AdminDashboard from '../../pages/AdminDashboard';
import PromoteToAdmin from '../../pages/PromoteToAdmin';

/**
 * AppContent - The Shell
 * 
 * Single-Instance Viewport: Globe and Radio Player are mounted once and never unmount
 * Universal Router: State-based navigation via React Router
 * The Firewall: Boot sequence handled by Gatekeeper in Layout
 */
export default function AppContent() {
  return (
    <Router>
      {/* Persistent Radio Player - Never Unmounts */}
      <PersistentRadioPlayer />
      
      <Routes>
        {/* Boot Sequence Pages */}
        <Route path="/AccountConsents" element={<PageWrapper><AccountConsents /></PageWrapper>} />
        <Route path="/OnboardingGate" element={<PageWrapper><OnboardingGate /></PageWrapper>} />
        
        {/* Main Application Pages */}
        <Route path="/" element={<PageWrapper pageName="Home"><Home /></PageWrapper>} />
        <Route path="/Home" element={<PageWrapper pageName="Home"><Home /></PageWrapper>} />
        <Route path="/Globe" element={<PageWrapper pageName="Globe"><Globe /></PageWrapper>} />
        <Route path="/Connect" element={<PageWrapper pageName="Connect"><Connect /></PageWrapper>} />
        <Route path="/Marketplace" element={<PageWrapper pageName="Marketplace"><Marketplace /></PageWrapper>} />
        <Route path="/Profile" element={<PageWrapper pageName="Profile"><Profile /></PageWrapper>} />
        <Route path="/BeaconDetail" element={<PageWrapper pageName="BeaconDetail"><BeaconDetail /></PageWrapper>} />
        <Route path="/Settings" element={<PageWrapper pageName="Settings"><Settings /></PageWrapper>} />
        <Route path="/Messages" element={<PageWrapper pageName="Messages"><Messages /></PageWrapper>} />
        <Route path="/Challenges" element={<PageWrapper pageName="Challenges"><Challenges /></PageWrapper>} />
        <Route path="/Safety" element={<PageWrapper pageName="Safety"><Safety /></PageWrapper>} />
        <Route path="/Feed" element={<PageWrapper pageName="Feed"><Feed /></PageWrapper>} />
        <Route path="/Stats" element={<PageWrapper pageName="Stats"><Stats /></PageWrapper>} />
        <Route path="/Events" element={<PageWrapper pageName="Events"><Events /></PageWrapper>} />
        <Route path="/Leaderboard" element={<PageWrapper pageName="Leaderboard"><Leaderboard /></PageWrapper>} />
        
        {/* Admin Pages */}
        <Route path="/AdminDashboard" element={<PageWrapper pageName="AdminDashboard"><AdminDashboard /></PageWrapper>} />
        <Route path="/PromoteToAdmin" element={<PageWrapper pageName="PromoteToAdmin"><PromoteToAdmin /></PageWrapper>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/Home" replace />} />
      </Routes>
    </Router>
  );
}

function PageWrapper({ children, pageName = '' }) {
  return (
    <Layout currentPageName={pageName}>
      {children}
    </Layout>
  );
}