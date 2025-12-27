import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, DollarSign, TrendingUp, Users, BookOpen, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Purchase {
  id: string;
  student_id: string;
  course_id: string;
  amount_cents: number;
  status: string;
  purchased_at: string;
  stripe_subscription_id: string | null;
  course?: { title: string };
  profile?: { full_name: string; email: string };
}

interface RevenueStats {
  totalRevenue: number;
  activeSubscriptions: number;
  totalPurchases: number;
  monthlyRevenue: { month: string; revenue: number }[];
  courseRevenue: { name: string; revenue: number }[];
}

const COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const AdminRevenue = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0,
    activeSubscriptions: 0,
    totalPurchases: 0,
    monthlyRevenue: [],
    courseRevenue: [],
  });

  useEffect(() => {
    if (!authLoading && profile?.role !== 'mentor') {
      navigate('/dashboard');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    // Fetch all purchases
    const { data: purchaseData, error } = await supabase
      .from('course_purchases')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
      setLoading(false);
      return;
    }

    // Fetch course titles
    const courseIds = [...new Set(purchaseData?.map(p => p.course_id) || [])];
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds);

    // Fetch student names
    const studentIds = [...new Set(purchaseData?.map(p => p.student_id) || [])];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds);

    // Enrich purchase data
    const enrichedPurchases = (purchaseData || []).map(p => ({
      ...p,
      course: courses?.find(c => c.id === p.course_id),
      profile: profiles?.find(pr => pr.id === p.student_id),
    }));

    setPurchases(enrichedPurchases);

    // Calculate stats
    const completedPurchases = purchaseData?.filter(p => p.status === 'completed' || p.status === 'active') || [];
    const totalRevenue = completedPurchases.reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
    const activeSubscriptions = completedPurchases.filter(p => p.stripe_subscription_id).length;

    // Monthly revenue (last 6 months)
    const monthlyData: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyData[key] = 0;
    }

    completedPurchases.forEach(p => {
      if (p.purchased_at) {
        const date = new Date(p.purchased_at);
        const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (monthlyData[key] !== undefined) {
          monthlyData[key] += (p.amount_cents || 0) / 100;
        }
      }
    });

    // Course revenue breakdown
    const courseRevenueMap: { [key: string]: number } = {};
    completedPurchases.forEach(p => {
      const courseName = courses?.find(c => c.id === p.course_id)?.title || 'Unknown';
      courseRevenueMap[courseName] = (courseRevenueMap[courseName] || 0) + (p.amount_cents || 0) / 100;
    });

    setStats({
      totalRevenue,
      activeSubscriptions,
      totalPurchases: completedPurchases.length,
      monthlyRevenue: Object.entries(monthlyData).map(([month, revenue]) => ({ month, revenue })),
      courseRevenue: Object.entries(courseRevenueMap)
        .map(([name, revenue]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5),
    });

    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Revenue Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track subscription revenue and course sales
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-600" />
                ${stats.totalRevenue.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Subscriptions</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-blue-600" />
                {stats.activeSubscriptions}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Purchases</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Users className="h-6 w-6 text-purple-600" />
                {stats.totalPurchases}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Recurring</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-orange-600" />
                ${(stats.activeSubscriptions * 10).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Revenue over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Course</CardTitle>
              <CardDescription>Top 5 courses by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {stats.courseRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.courseRevenue}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {stats.courseRevenue.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No revenue data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
            <CardDescription>Latest subscription and purchase activity</CardDescription>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No purchases yet</p>
            ) : (
              <div className="space-y-4">
                {purchases.slice(0, 10).map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{purchase.profile?.full_name || 'Unknown Student'}</p>
                      <p className="text-sm text-muted-foreground">{purchase.course?.title || 'Unknown Course'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${((purchase.amount_cents || 0) / 100).toFixed(2)}
                        {purchase.stripe_subscription_id && <span className="text-xs text-muted-foreground">/mo</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchase.purchased_at ? new Date(purchase.purchased_at).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
