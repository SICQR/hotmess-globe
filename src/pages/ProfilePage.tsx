/**
 * ProfilePage — User Profile
 * 
 * Avatar, stats, settings links, unified dark/gold theme.
 */

import { motion } from 'framer-motion';
import { FaCog, FaCamera, FaUserEdit, FaChevronRight, FaShieldAlt, FaBell, FaCreditCard, FaSignOutAlt, FaMedal, FaHeart } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppNavBar } from '@/components/nav/AppNavBar';
import { useAuth } from '@/lib/AuthContext';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-dark font-sans text-light flex flex-col pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="flex justify-between items-center px-4 py-5 border-b border-borderGlow">
        <span className="text-gold text-lg font-mono tracking-wide">My Profile</span>
        <button 
          onClick={() => navigate('/settings')}
          className="text-gold hover:text-goldGlow transition-colors"
        >
          <FaCog className="text-xl" />
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          USER CARD
      ───────────────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 px-4 py-6"
      >
        <div className="relative">
          <img
            src="/avatar.jpg"
            alt="Profile"
            className="w-24 h-24 rounded-full border-2 border-gold shadow-gold object-cover"
          />
          <button className="absolute bottom-0 right-0 bg-gold text-dark rounded-full p-2 shadow-gold hover:shadow-[0_0_24px_#FFC94088] transition-shadow">
            <FaCamera className="text-sm" />
          </button>
        </div>
        <div className="text-center">
          <div className="font-bold text-xl text-light">AlexTravels</div>
          <div className="rounded-full bg-chatGray px-4 py-1 text-muted mt-2 text-sm inline-block">
            Berlin · Joined 2023
          </div>
        </div>
        <button
          onClick={() => navigate('/profile/edit')}
          className="flex items-center text-gold gap-2 mt-2 hover:text-goldGlow transition-colors"
        >
          <FaUserEdit /> Edit Profile
        </button>
      </motion.section>

      {/* ─────────────────────────────────────────────────────────────────────
          STATS
      ───────────────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-around py-6 px-4 border-y border-borderGlow"
      >
        <StatItem value="1480" label="XP" icon={<FaMedal />} />
        <StatItem value="37" label="Friends" icon={<FaHeart />} />
        <StatItem value="12" label="Events" icon={<FaCamera />} />
        <StatItem value="Level 3" label="Rank" icon={<FaShieldAlt />} />
      </motion.section>

      {/* ─────────────────────────────────────────────────────────────────────
          SETTINGS LINKS
      ───────────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="divide-y divide-chatGray px-4 flex-1"
      >
        <SettingsLink
          icon={<FaCog />}
          label="Account Settings"
          onClick={() => navigate('/settings')}
        />
        <SettingsLink
          icon={<FaShieldAlt />}
          label="Privacy"
          onClick={() => navigate('/settings/privacy')}
        />
        <SettingsLink
          icon={<FaBell />}
          label="Notifications"
          onClick={() => navigate('/settings/notifications')}
        />
        <SettingsLink
          icon={<FaCreditCard />}
          label="Membership"
          onClick={() => navigate('/membership')}
          badge="PRO"
        />
        <SettingsLink
          icon={<FaSignOutAlt />}
          label="Sign Out"
          onClick={handleSignOut}
          danger
        />
      </motion.div>

      <AppNavBar active="profile" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT ITEM
// ─────────────────────────────────────────────────────────────────────────────

interface StatItemProps {
  value: string;
  label: string;
  icon: React.ReactNode;
}

function StatItem({ value, label, icon }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-gold text-lg mb-1">{icon}</span>
      <span className="font-bold text-lg text-gold">{value}</span>
      <span className="text-muted text-xs">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS LINK
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsLinkProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string;
  danger?: boolean;
}

function SettingsLink({ icon, label, onClick, badge, danger }: SettingsLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`flex justify-between items-center w-full py-4 transition-colors ${
        danger ? 'text-red-500 hover:text-red-400' : 'text-light hover:text-gold'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span>{label}</span>
        {badge && (
          <span className="bg-gold text-dark text-xs font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      <FaChevronRight className="text-muted" />
    </button>
  );
}
