import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const COLORS = ['#FF1493', '#B026FF', '#00D9FF', '#FFEB3B', '#FF6B35'];

export default function SalesAnalytics({ orders, products, allUsers }) {
  const analytics = useMemo(() => {
    // Revenue over time (last 30 days)
    const revenueByDay = {};
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = format(startOfDay(subDays(new Date(), 29 - i)), 'yyyy-MM-dd');
      revenueByDay[date] = { date: format(subDays(new Date(), 29 - i), 'MMM dd'), xp: 0, gbp: 0 };
      return date;
    });

    orders.forEach(order => {
      const orderDate = format(startOfDay(new Date(order.created_date)), 'yyyy-MM-dd');
      if (revenueByDay[orderDate]) {
        revenueByDay[orderDate].xp += order.total_xp || 0;
        revenueByDay[orderDate].gbp += order.total_gbp || 0;
      }
    });

    const revenueData = Object.values(revenueByDay);

    // Top selling products
    const productSales = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            name: item.product_name,
            sales: 0,
            revenue: 0
          };
        }
        productSales[item.product_id].sales += item.quantity;
        productSales[item.product_id].revenue += (item.price_xp * item.quantity);
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Customer demographics
    const buyerEmails = [...new Set(orders.map(o => o.buyer_email))];
    const buyers = allUsers.filter(u => buyerEmails.includes(u.email));
    
    const levelDistribution = buyers.reduce((acc, buyer) => {
      const level = Math.floor((buyer.xp || 0) / 1000) + 1;
      const bracket = level <= 5 ? '1-5' : level <= 10 ? '6-10' : level <= 20 ? '11-20' : '20+';
      acc[bracket] = (acc[bracket] || 0) + 1;
      return acc;
    }, {});

    const demographics = Object.entries(levelDistribution).map(([level, count]) => ({
      level,
      count
    }));

    // Payment method distribution
    const paymentMethods = orders.reduce((acc, order) => {
      acc[order.payment_method] = (acc[order.payment_method] || 0) + 1;
      return acc;
    }, {});

    const paymentData = Object.entries(paymentMethods).map(([method, count]) => ({
      name: method === 'xp' ? 'XP' : 'Stripe',
      value: count
    }));

    return {
      revenueData,
      topProducts,
      demographics,
      paymentData,
      totalRevenue: orders.reduce((sum, o) => sum + (o.total_xp || 0), 0),
      totalRevenueGBP: orders.reduce((sum, o) => sum + (o.total_gbp || 0), 0),
      totalOrders: orders.length,
      uniqueCustomers: buyerEmails.length
    };
  }, [orders, products, allUsers]);

  const stats = [
    { label: 'Total Revenue', value: `${analytics.totalRevenue.toLocaleString()} XP`, icon: DollarSign, color: '#FFEB3B' },
    { label: 'GBP Revenue', value: `£${analytics.totalRevenueGBP.toFixed(2)}`, icon: DollarSign, color: '#00D9FF' },
    { label: 'Total Orders', value: analytics.totalOrders, icon: Package, color: '#FF1493' },
    { label: 'Customers', value: analytics.uniqueCustomers, icon: Users, color: '#B026FF' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-white/40">{stat.label}</span>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue Over Time */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FFEB3B]" />
          Revenue Over Time (Last 30 Days)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
            <XAxis dataKey="date" stroke="#ffffff60" fontSize={12} />
            <YAxis stroke="#ffffff60" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '8px' }}
              labelStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="xp" stroke="#FFEB3B" strokeWidth={2} name="XP Revenue" />
            <Line type="monotone" dataKey="gbp" stroke="#00D9FF" strokeWidth={2} name="GBP Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#FF1493]" />
            Top Selling Products
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
              <XAxis dataKey="name" stroke="#ffffff60" fontSize={12} />
              <YAxis stroke="#ffffff60" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="sales" fill="#FF1493" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Customer Demographics */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B026FF]" />
            Customer Levels
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.demographics}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ level, percent }) => `Level ${level}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.demographics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff20', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}