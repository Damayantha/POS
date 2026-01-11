import { useState, useEffect } from 'react';
import { DollarSign, Euro, PoundSterling, JapaneseYen, IndianRupee, Coins, ShoppingCart, TrendingUp, Package, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button'; // Assuming Button is available
import { StatCard } from '../components/ui/Card';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '../stores/authStore';

import AIInsightsWidget from '../components/dashboard/AIInsightsWidget';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        todaySales: 0,
        todayTransactions: 0,
        monthSales: 0,
        lowStockCount: 0,
    });
    const [salesTrend, setSalesTrend] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewScope, setViewScope] = useState('store'); // 'store' or 'personal'

    const { currentEmployee: user } = useAuthStore();

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user, viewScope]);

    const getDateString = (date) => {
        return date.toISOString().replace('T', ' ').slice(0, 19);
    };

    const loadDashboardData = async () => {
        try {
            const now = new Date();
            const todayStart = getDateString(startOfDay(now));
            const todayEnd = getDateString(endOfDay(now));
            const monthStart = getDateString(startOfMonth(now));
            const monthEnd = getDateString(endOfMonth(now));

            // Last 7 days for trend
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 6);
            const trendStart = getDateString(startOfDay(sevenDaysAgo));

            console.log('Loading Dashboard Data...', viewScope);

            // Scope params
            // If viewScope is personal, restrict by employeeId. Else show all.
            const params = viewScope === 'personal' ? { employeeId: user?.id } : {};
            const monthParams = { ...params, startDate: monthStart, endDate: monthEnd };

            // Get today's stats
            let todayStats = {};
            try {
                todayStats = await window.electronAPI.sales.getStats({ ...params, startDate: todayStart, endDate: todayEnd });
            } catch (e) { console.error('Error fetching todayStats:', e); }

            // Get month stats
            let monthStats = {};
            try {
                monthStats = await window.electronAPI.sales.getStats(monthParams);
            } catch (e) { console.error('Error fetching monthStats:', e); }

            // Get low stock products (Global, maybe restrict view but usually visible to all who see dashboard)
            let lowStock = [];
            try {
                lowStock = await window.electronAPI.inventory.getLowStock();
            } catch (e) { console.error('Error fetching lowStock:', e); }

            // Get recent sales
            let sales = [];
            try {
                // getToday needs internal update to accept params in main.js, we did that.
                // But wait, getToday in main.js uses split('T')[0] effectively ignoring time, but we updated it to accept params?
                // Actually `getToday` in main.js takes `params` now.
                sales = await window.electronAPI.sales.getToday(params);
            } catch (e) { console.error('Error fetching recentSales:', e); }

            // Get top products this month
            let top = [];
            try {
                top = await window.electronAPI.reports.topProducts({ ...monthParams, limit: 5 });
            } catch (e) { console.error('Error fetching topProducts:', e); }

            // Get sales by category
            let categories = [];
            try {
                categories = await window.electronAPI.reports.salesByCategory(monthParams);
            } catch (e) { console.error('Error fetching salesByCategory:', e); }

            // Get sales trend (last 7 days)
            // Trend usually better as global, but let's scope it too
            let trend = [];
            try {
                trend = await window.electronAPI.reports.salesByDate({ ...params, startDate: trendStart, endDate: todayEnd });
            } catch (e) { console.error('Error fetching salesByDate:', e); }

            // Get payment methods
            let methods = [];
            try {
                methods = await window.electronAPI.reports.paymentMethods(monthParams);
            } catch (e) { console.error('Error fetching paymentMethods:', e); }

            setStats({
                todaySales: todayStats.total_revenue || 0,
                todayTransactions: todayStats.total_transactions || 0,
                monthSales: monthStats.total_revenue || 0,
                lowStockCount: lowStock.length || 0,
            });

            setRecentSales(sales.slice(0, 5));
            setTopProducts(top);

            setCategoryData(categories.map(c => ({
                name: c.category_name || 'Uncategorized',
                value: c.total_revenue,
                color: c.category_color || '#6b7280',
            })));

            setSalesTrend(trend.map(t => ({
                date: format(new Date(t.date), 'MMM dd'),
                revenue: t.revenue
            })));

            const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
            setPaymentMethods(methods.map((m, index) => ({
                name: m.method.charAt(0).toUpperCase() + m.method.slice(1),
                value: m.count,
                total: m.total,
                color: COLORS[index % COLORS.length]
            })));

        } catch (error) {
            console.error('Failed to load dashboard data (General):', error);
        } finally {
            setLoading(false);
        }
    };

    const [currency, setCurrency] = useState('USD');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await window.electronAPI.settings.getAll();
                let parsed = { ...settings };
                if (settings.store_config) {
                    const config = typeof settings.store_config === 'string'
                        ? JSON.parse(settings.store_config)
                        : settings.store_config;
                    parsed = { ...parsed, ...config };
                }
                if (parsed.currency) setCurrency(parsed.currency);
            } catch (e) { console.error(e); }
        };
        fetchSettings();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const getCurrencyIcon = () => {
        switch (currency) {
            case 'USD': return DollarSign;
            case 'EUR': return Euro;
            case 'GBP': return PoundSterling;
            case 'JPY': return JapaneseYen;
            case 'INR': return IndianRupee;
            default: return Coins;
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Dashboard</h1>
                        <p className="text-zinc-500">Welcome back! Here's what's happening today.</p>
                    </div>

                    <div className="bg-dark-tertiary p-1 rounded-lg flex gap-1">
                        <Button
                            size="sm"
                            variant={viewScope === 'store' ? 'primary' : 'ghost'}
                            onClick={() => setViewScope('store')}
                        >
                            Store Overview
                        </Button>
                        <Button
                            size="sm"
                            variant={viewScope === 'personal' ? 'primary' : 'ghost'}
                            onClick={() => setViewScope('personal')}
                        >
                            My Stats
                        </Button>
                    </div>
                </div>

                {/* AI Insights Widget */}
                <AIInsightsWidget salesData={{ stats, recentSales, topProducts }} />

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Today's Sales"
                        value={formatCurrency(stats.todaySales)}
                        icon={getCurrencyIcon()}
                        color="success"
                    />
                    <StatCard
                        label="Transactions"
                        value={stats.todayTransactions}
                        icon={ShoppingCart}
                        color="primary"
                    />
                    <StatCard
                        label="This Month"
                        value={formatCurrency(stats.monthSales)}
                        icon={TrendingUp}
                        color="primary"
                    />
                    <StatCard
                        label="Low Stock Items"
                        value={stats.lowStockCount}
                        icon={stats.lowStockCount > 0 ? AlertTriangle : Package}
                        color={stats.lowStockCount > 0 ? 'warning' : 'success'}
                    />
                </div>

                {/* Sales Trend Chart */}
                <div className="card">
                    <h3 className="font-semibold mb-4">Sales Trend (Last 7 Days)</h3>
                    {salesTrend.length > 0 ? (
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#71717a"
                                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                        tickFormatter={(value) => formatCurrency(value)}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                                        contentStyle={{
                                            backgroundColor: '#1a1a1a',
                                            border: '1px solid #27272a',
                                            borderRadius: '8px',
                                            color: '#fff'
                                        }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value) => [formatCurrency(value), 'Revenue']}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#8b5cf6"
                                        radius={[4, 4, 0, 0]}
                                        barSize={40}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-zinc-500">
                            No sales data available
                        </div>
                    )}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Top Products */}
                    <div className="card lg:col-span-1 overflow-hidden">
                        <h3 className="font-semibold mb-4">Top Selling</h3>
                        {topProducts.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topProducts} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="product_name"
                                            type="category"
                                            width={100}
                                            stroke="#71717a"
                                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{
                                                backgroundColor: '#1a1a1a',
                                                border: '1px solid #27272a',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Bar dataKey="total_quantity" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No sales data
                            </div>
                        )}
                    </div>

                    {/* Sales by Category */}
                    <div className="card lg:col-span-1 overflow-hidden">
                        <h3 className="font-semibold mb-4">Categories</h3>
                        {categoryData.length > 0 ? (
                            <div className="h-64 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={2}
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1a1a1a',
                                                border: '1px solid #27272a',
                                                borderRadius: '8px',
                                                color: '#fff'
                                            }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value) => formatCurrency(value)}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <span className="text-xs text-zinc-500">Total</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No data
                            </div>
                        )}
                    </div>

                    {/* Payment Methods */}
                    <div className="card lg:col-span-1 overflow-hidden">
                        <h3 className="font-semibold mb-4">Payments</h3>
                        {paymentMethods.length > 0 ? (
                            <>
                                <div className="h-48 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentMethods}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={2}
                                            >
                                                {paymentMethods.map((entry, index) => (
                                                    <Cell key={index} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#1a1a1a',
                                                    border: '1px solid #27272a',
                                                    borderRadius: '8px',
                                                    color: '#fff'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(value, name, props) => [
                                                    `${value} txns (${formatCurrency(props.payload.total)})`,
                                                    name
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 pt-3 border-t border-dark-border">
                                    <div className="grid grid-cols-2 gap-2">
                                        {paymentMethods.map((method, i) => (
                                            <div key={i} className="flex items-center gap-1.5 text-xs">
                                                <div
                                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: method.color }}
                                                />
                                                <span className="text-zinc-400 truncate">{method.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-zinc-500">
                                No data
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Sales */}
                <div className="card">
                    <h3 className="font-semibold mb-4">Recent Transactions</h3>
                    {recentSales.length > 0 ? (
                        <div className="space-y-3">
                            {recentSales.map(sale => (
                                <div
                                    key={sale.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-dark-tertiary/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                                            <ShoppingCart className="w-5 h-5 text-accent-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">#{sale.receipt_number}</p>
                                            <p className="text-xs text-zinc-500">
                                                {sale.employee_name} • {format(new Date(sale.created_at), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-semibold text-green-400">{formatCurrency(sale.total)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-zinc-500">
                            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No transactions today</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
