import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const COLORS = ['#C8962C', '#C8962C', '#00D9FF', '#FFEB3B', '#FF6B35'];

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

    const buyerEmails = [...new Set(orders.map(o => o.buyer_email))];

    // Payment method distribution
    const paymentMethods = orders.reduce((acc, order) => {
      acc[order.payment_method] = (acc[order.payment_method] || 0) + 1;
      return acc;
    }, {});

    const paymentData = Object.entries(paymentMethods).map(([method, count]) => ({
      name: method === 'xp' ? 'Credits' : 'Stripe',
      value: count
    }));

    return {
      revenueData,
      topProducts,
      paymentData,
      totalRevenueGBP: orders.reduce((sum, o) => sum + (o.total_gbp || 0), 0),
      totalOrders: orders.length,
      uniqueCustomers: buyerEmails.length
    };
  }, [orders, products, allUsers]);

  const stats = [
    { label: 'Revenue', value: `£${analytics.totalRevenueGBP.toFixed(2)}`, icon: DollarSign, color: '#C8962C' },
    { label: 'Total Orders', value: analytics.totalOrders, icon: Package, color: '#00D9FF' },
    { label: 'Customers', value: analytics.uniqueCustomers, icon: Users, color: '#C8962C' },
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
          <TrendingUp className="w-5 h-5 text-[#C8962C]" />
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
            <Line type="monotone" dataKey="gbp" stroke="#C8962C" strokeWidth={2} name="GBP Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#C8962C]" />
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
              <Bar dataKey="sales" fill="#C8962C" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Unique Customers */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-8 h-8 text-[#C8962C] mx-auto mb-2" />
            <p className="text-3xl font-black text-[#C8962C]">{analytics.uniqueCustomers}</p>
            <p className="text-xs uppercase tracking-wider text-white/40 mt-1">Unique Customers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
