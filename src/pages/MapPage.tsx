/**
 * MapPage — Pulse/Globe Map View
 * 
 * 3D globe background with location markers, cluster cards,
 * unified dark/gold theme.
 */

import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaUsers, FaExpand, FaLocationArrow } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppNavBar } from '@/components/nav/AppNavBar';

const clusters = [
  { id: '1', name: 'Soho Cluster', count: 24, distance: '0.8 km' },
  { id: '2', name: 'Vauxhall', count: 18, distance: '2.1 km' },
  { id: '3', name: 'Shoreditch', count: 12, distance: '3.5 km' },
];

export default function MapPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark font-sans text-light flex flex-col pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-borderGlow">
        <div className="flex items-center gap-2">
          <FaLocationArrow className="text-gold" />
          <span className="text-gold text-lg font-semibold">London</span>
        </div>
        <div className="flex gap-3">
          <button className="text-gold text-xl hover:text-goldGlow transition-colors">
            <FaUsers />
          </button>
          <button className="text-gold text-xl hover:text-goldGlow transition-colors">
            <FaExpand />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          MAP VISUAL
      ───────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 bg-darkest bg-[url('/static/globe-bg.jpg')] bg-cover bg-center rounded-lg shadow-gold mt-4 mx-4 relative overflow-hidden min-h-[300px]">
          {/* Globe overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark/80" />

          {/* Hotspot markers */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 75, delay: 0.2 }}
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <FaMapMarkerAlt className="text-goldGlow text-5xl drop-shadow-[0_0_16px_#FFC940]" />
            </motion.div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-gold"
              animate={{
                scale: [1, 2, 2],
                opacity: [0.6, 0, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>

          {/* Secondary marker */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute left-1/4 top-1/2"
          >
            <FaMapMarkerAlt className="text-accent text-3xl drop-shadow-[0_0_10px_#C8962C80]" />
          </motion.div>

          {/* Third marker */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7 }}
            className="absolute right-1/4 top-2/5"
          >
            <FaMapMarkerAlt className="text-online text-3xl drop-shadow-[0_0_10px_#38E38D80]" />
          </motion.div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────
            CLUSTER CARDS
        ───────────────────────────────────────────────────────────────────── */}
        <div className="px-4 py-4 space-y-3">
          <h3 className="text-muted text-sm font-semibold uppercase tracking-wide">
            Nearby Hotspots
          </h3>
          {clusters.map((cluster, idx) => (
            <motion.button
              key={cluster.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              onClick={() => navigate(`/pulse?cluster=${cluster.id}`)}
              className="w-full bg-gray py-3 px-4 rounded-lg flex justify-between items-center shadow-gold border border-borderGlow hover:bg-chatGray transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <FaMapMarkerAlt className="text-gold" />
                </div>
                <div className="text-left">
                  <span className="text-light font-semibold block">{cluster.name}</span>
                  <span className="text-muted text-sm">{cluster.distance}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gold font-bold">{cluster.count}</span>
                <FaUsers className="text-muted" />
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Bottom Nav */}
      <AppNavBar active="pulse" />
    </div>
  );
}
