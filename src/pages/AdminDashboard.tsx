import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  LayoutDashboard, 
  BarChart3, 
  MousePointerClick, 
  Settings, 
  LogOut,
  Users,
  Eye,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const COLORS = ['hsl(210, 100%, 50%)', 'hsl(210, 80%, 60%)', 'hsl(210, 60%, 70%)', 'hsl(210, 40%, 80%)', 'hsl(210, 30%, 85%)'];

export default function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading, admin, logout, changePassword, getToken } = useAdminAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Dashboard data states
  const [overview, setOverview] = useState<any>(null);
  const [visitorsOverTime, setVisitorsOverTime] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]);
  const [airbnbClicksOverTime, setAirbnbClicksOverTime] = useState<any[]>([]);
  const [airbnbClicksBySource, setAirbnbClicksBySource] = useState<any[]>([]);
  const [airbnbClicksByPage, setAirbnbClicksByPage] = useState<any[]>([]);
  const [airbnbClicksByDevice, setAirbnbClicksByDevice] = useState<any[]>([]);
  const [airbnbClicksBySuite, setAirbnbClicksBySuite] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  
  // Settings state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const fetchDashboardData = async () => {
    const token = getToken();
    if (!token) return;

    setIsRefreshing(true);

    try {
      const actions = [
        'overview',
        'visitors-over-time',
        'traffic-sources',
        'top-pages',
        'device-breakdown',
        'airbnb-clicks-over-time',
        'airbnb-clicks-by-source',
        'airbnb-clicks-by-page',
        'airbnb-clicks-by-device',
        'airbnb-clicks-by-suite',
        'funnel'
      ];

      const results = await Promise.all(
        actions.map(action =>
          supabase.functions.invoke('analytics-dashboard', {
            body: { action, token, startDate, endDate }
          })
        )
      );

      setOverview(results[0].data);
      setVisitorsOverTime(results[1].data || []);
      setTrafficSources(results[2].data || []);
      setTopPages(results[3].data || []);
      setDeviceBreakdown(results[4].data || []);
      setAirbnbClicksOverTime(results[5].data || []);
      setAirbnbClicksBySource(results[6].data || []);
      setAirbnbClicksByPage(results[7].data || []);
      setAirbnbClicksByDevice(results[8].data || []);
      setAirbnbClicksBySuite(results[9].data || []);
      setFunnel(results[10].data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, startDate, endDate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    const result = await changePassword(newPassword);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to change password',
        variant: 'destructive',
      });
    }
    setIsChangingPassword(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <h1 className="text-lg font-bold">Haven Analytics</h1>
          </div>
          
          <nav className="flex-1 space-y-1 p-4">
            <Button
              variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('overview')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Overview
            </Button>
            <Button
              variant={activeTab === 'traffic' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('traffic')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Traffic Analytics
            </Button>
            <Button
              variant={activeTab === 'airbnb' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('airbnb')}
            >
              <MousePointerClick className="mr-2 h-4 w-4" />
              Airbnb Clicks
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>

          <div className="border-t p-4">
            <div className="mb-2 text-sm text-muted-foreground">
              {admin?.email}
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Analytics overview for Haven at Deer Park
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={fetchDashboardData} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.totalVisitors || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.uniqueVisitors || 0} unique visitors
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.pageviews || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.bounceRate || 0}% bounce rate
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.floor((overview?.avgSessionDuration || 0) / 60)}m {(overview?.avgSessionDuration || 0) % 60}s
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.repeatVisitors || 0} repeat visitors
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Airbnb Clicks</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.airbnbClicks || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {overview?.conversionRate || 0}% conversion rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Visitors Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={visitorsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="visitors" stroke="hsl(210, 100%, 50%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={trafficSources}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                      >
                        {trafficSources.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Visitors → Engaged → Airbnb Clicks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{funnel?.visitors || 0}</div>
                    <div className="text-sm text-muted-foreground">Visitors</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{funnel?.engaged || 0}</div>
                    <div className="text-sm text-muted-foreground">Engaged</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">→</div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">{funnel?.clicks || 0}</div>
                    <div className="text-sm text-muted-foreground">Airbnb Clicks</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Traffic Analytics Tab */}
        {activeTab === 'traffic' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Visitors Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={visitorsOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="visitors" stroke="hsl(210, 100%, 50%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={deviceBreakdown}
                        dataKey="count"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ device, percent }) => `${device} ${(percent * 100).toFixed(0)}%`}
                      >
                        {deviceBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPages.map((page, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-medium">{page.page}</span>
                      <span className="text-muted-foreground">{page.views} views</span>
                    </div>
                  ))}
                  {topPages.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trafficSources}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(210, 100%, 50%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Airbnb Clicks Tab */}
        {activeTab === 'airbnb' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Total Airbnb Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold text-primary">{overview?.airbnbClicks || 0}</div>
                <p className="text-muted-foreground mt-2">
                  {overview?.conversionRate || 0}% of visitors clicked through to Airbnb
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Clicks Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={airbnbClicksOverTime}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="clicks" stroke="hsl(210, 100%, 50%)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clicks by Device</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={airbnbClicksByDevice}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="device" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="hsl(210, 100%, 50%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Traffic Sources</CardTitle>
                  <CardDescription>Sources generating Airbnb clicks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {airbnbClicksBySource.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{item.source}</span>
                        <span className="text-muted-foreground">{item.clicks} clicks</span>
                      </div>
                    ))}
                    {airbnbClicksBySource.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clicks by Page</CardTitle>
                  <CardDescription>Pages generating Airbnb clicks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {airbnbClicksByPage.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="font-medium">{item.page}</span>
                        <span className="text-muted-foreground">{item.clicks} clicks</span>
                      </div>
                    ))}
                    {airbnbClicksByPage.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clicks by Suite & Location */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Clicks by Suite</CardTitle>
                  <CardDescription>Which listing visitors clicked most</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={airbnbClicksBySuite}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="suite" tickFormatter={(v: string) => ({ entire_place: 'Entire Place', '7_person': '7-Person', '12_person': '12-Person', other: 'Other' }[v] || v)} />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => [value, 'Clicks']}
                        labelFormatter={(label: string) => ({ entire_place: 'Entire Place', '7_person': '7-Person Suite', '12_person': '12-Person Suite', other: 'Other' }[label] || label)}
                      />
                      <Bar dataKey="clicks" fill="hsl(210, 100%, 50%)" />
                    </BarChart>
                  </ResponsiveContainer>
                  {airbnbClicksBySuite.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Clicks by Location</CardTitle>
                  <CardDescription>Where on the page visitors clicked</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={airbnbClicksByPage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="page" type="category" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="hsl(210, 80%, 60%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your admin password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}