import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Ticket, Shirt, Trophy, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MARKETPLACE_ITEMS = [
  { id: 1, name: 'VIP Pass', price: 5000, type: 'ticket', icon: Ticket, color: '#FFEB3B' },
  { id: 2, name: 'HOTMESS Merch', price: 2000, type: 'merch', icon: Shirt, color: '#FF1493' },
  { id: 3, name: 'Exclusive Badge', price: 3000, type: 'badge', icon: Trophy, color: '#00D9FF' },
  { id: 4, name: 'Premium Event', price: 10000, type: 'ticket', icon: Sparkles, color: '#B026FF' },
  { id: 5, name: 'Limited Edition Tee', price: 4000, type: 'merch', icon: Shirt, color: '#FF6B35' },
  { id: 6, name: 'Founder Badge', price: 15000, type: 'badge', icon: Trophy, color: '#39FF14' },
];

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('all');

  const filteredItems = activeTab === 'all' 
    ? MARKETPLACE_ITEMS 
    : MARKETPLACE_ITEMS.filter(item => item.type === activeTab);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
                Marketplace
              </h1>
              <p className="text-white/60">Spend your XP on exclusive items and experiences</p>
            </div>
            <Button className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
              <Plus className="w-4 h-4 mr-2" />
              Sell Item
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              All Items
            </TabsTrigger>
            <TabsTrigger value="ticket" className="data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black">
              Tickets
            </TabsTrigger>
            <TabsTrigger value="merch" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black">
              Merch
            </TabsTrigger>
            <TabsTrigger value="badge" className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black">
              Badges
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div 
                      className="h-48 flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Icon className="w-20 h-20" style={{ color: item.color }} />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-black" style={{ color: item.color }}>
                          {item.price.toLocaleString()} XP
                        </div>
                        <Button
                          size="sm"
                          className="text-black font-bold"
                          style={{ backgroundColor: item.color }}
                        >
                          Buy
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No items found</p>
          </div>
        )}
      </div>
    </div>
  );
}