import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Briefcase, 
  Trophy, 
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  PlusCircle,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Filter,
  Settings
} from 'lucide-react';
import { 
  fetchWalletData, 
  fetchWorks, 
  fetchCampaigns,
  dataCache
} from '@/lib/data-cache';

interface WalletData {
  earnedBalance: number;
  addedBalance: number;
  pendingAddMoney: number;
  totalWithdrawn: number;
}

interface WorkSubmission {
  id: string;
  campaignId: string;
  campaignTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  reward: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [recentWork, setRecentWork] = useState<WorkSubmission[]>([]);
  const [stats, setStats] = useState({
    pendingWorks: 0,
    approvedWorks: 0,
    rejectedWorks: 0,
    activeCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch wallet with error handling
        let walletData = null;
        try {
          walletData = await fetchWalletData(profile.uid);
          if (walletData) {
            setWallet(walletData);
          }
        } catch (walletError) {
          console.error('Error fetching wallet:', walletError);
          // Set default wallet data if fetch fails
          setWallet({
            earnedBalance: 0,
            addedBalance: 0,
            pendingAddMoney: 0,
            totalWithdrawn: 0
          });
        }

        // Fetch recent work submissions
        let worksData = {};
        try {
          worksData = await fetchWorks(profile.uid);
        } catch (worksError) {
          console.error('Error fetching works:', worksError);
          worksData = {};
        }

        if (worksData) {
          const worksArray: WorkSubmission[] = Object.entries(worksData).map(([id, data]: [string, any]) => ({
            id,
            ...data,
          }));
          
          // Sort by date and get recent 5
          worksArray.sort((a, b) => b.submittedAt - a.submittedAt);
          setRecentWork(worksArray.slice(0, 5));

          // Calculate stats
          const pending = worksArray.filter(w => w.status === 'pending').length;
          const approved = worksArray.filter(w => w.status === 'approved').length;
          const rejected = worksArray.filter(w => w.status === 'rejected').length;
          
          setStats(prev => ({
            ...prev,
            pendingWorks: pending,
            approvedWorks: approved,
            rejectedWorks: rejected,
          }));
        }

        // Count active campaigns created by user
        let campaignsData = {};
        try {
          campaignsData = await fetchCampaigns();
        } catch (campaignsError) {
          console.error('Error fetching campaigns:', campaignsError);
          campaignsData = {};
        }

        if (campaignsData) {
          const userCampaigns = Object.values(campaignsData).filter(
            (c: any) => c.creatorId === profile.uid && c.status === 'active'
          );
          setStats(prev => ({ ...prev, activeCampaigns: userCampaigns.length }));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [profile?.uid]);

  const totalBalance = (wallet?.earnedBalance || 0) + (wallet?.addedBalance || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-pending/10 text-pending border-pending/30">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Rejected</Badge>;
      default:
        return null;
    }
  };

  const statCards = [
    {
      title: 'Total Balance',
      value: `₹${totalBalance.toFixed(2)}`,
      icon: Wallet,
      color: 'from-primary to-accent',
      change: '+12.5%',
      changeType: 'positive'
    },
    {
      title: 'Approved Works',
      value: profile?.approvedWorks || 0,
      icon: CheckCircle2,
      color: 'from-success to-emerald-500',
      change: '+8.2%',
      changeType: 'positive'
    },
    {
      title: 'Pending Works',
      value: stats.pendingWorks,
      icon: Clock,
      color: 'from-pending to-amber-500',
      change: '-2.1%',
      changeType: 'negative'
    },
    {
      title: 'My Campaigns',
      value: stats.activeCampaigns,
      icon: Briefcase,
      color: 'from-blue-500 to-cyan-500',
      change: '+15.3%',
      changeType: 'positive'
    }
  ];

  const quickActions = [
    {
      title: 'Browse Campaigns',
      description: 'Find tasks to complete',
      icon: Briefcase,
      color: 'bg-gradient-to-r from-primary to-accent',
      link: '/campaigns'
    },
    {
      title: 'Create Campaign',
      description: 'Get work done by others',
      icon: PlusCircle,
      color: 'bg-gradient-to-r from-emerald-500 to-teal-500',
      link: '/campaigns/create'
    },
    {
      title: 'Manage Wallet',
      description: 'View and manage funds',
      icon: Wallet,
      color: 'bg-gradient-to-r from-purple-500 to-indigo-500',
      link: '/wallet'
    },
    {
      title: 'Leaderboard',
      description: 'See top earners',
      icon: Trophy,
      color: 'bg-gradient-to-r from-amber-500 to-orange-500',
      link: '/leaderboard'
    }
  ];

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-2">
                Welcome back, {profile?.fullName?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-muted-foreground text-lg">
                Here's an overview of your WorkHub activity.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className={`h-2 bg-gradient-to-r ${stat.color}`}></div>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                      <p className="font-display text-3xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {stat.changeType === 'positive' ? (
                          <ArrowUp className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-destructive" />
                        )}
                        <span className={`text-sm ${stat.changeType === 'positive' ? 'text-success' : 'text-destructive'}`}>
                          {stat.change} from last month
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Quick Actions</h2>
            <Link to="/dashboard" className="text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link to={action.link} key={index} className="block group">
                <Card className="h-full hover:shadow-lg transition-all duration-300 group-hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{action.title}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{action.description}</p>
                    <div className="flex items-center text-primary text-sm font-medium">
                      Get started
                      <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Work */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Work</CardTitle>
              <Link to="/my-work">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-center py-12">
                  <XCircle className="h-16 w-16 text-destructive/30 mx-auto mb-4" />
                  <p className="text-destructive text-lg mb-2">Error Loading Data</p>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </div>
              )}
              {!error && recentWork.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg mb-2">No work submissions yet</p>
                  <p className="text-muted-foreground mb-4">Start working on campaigns to see your progress here</p>
                  <Link to="/campaigns">
                    <Button className="gap-2">
                      <Briefcase className="h-4 w-4" />
                      Browse Campaigns
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentWork.map((work) => (
                    <div
                      key={work.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">
                          {work.campaignTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(work.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-foreground flex items-center">
                          <IndianRupee className="h-3 w-3" />
                          {work.reward}
                        </span>
                        {getStatusBadge(work.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Wallet Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Wallet Summary</CardTitle>
              <Link to="/wallet">
                <Button variant="ghost" size="sm" className="gap-1">
                  Manage Wallet
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {wallet ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-success/10 to-emerald-500/10 border border-success/20">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-success to-emerald-500 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Earned Balance</p>
                        <p className="font-semibold text-foreground">From completed tasks</p>
                      </div>
                    </div>
                    <p className="font-display text-2xl font-bold text-success flex items-center">
                      <IndianRupee className="h-5 w-5" />
                      {(wallet.earnedBalance || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Added Balance</p>
                        <p className="font-semibold text-foreground">For campaigns</p>
                      </div>
                    </div>
                    <p className="font-display text-2xl font-bold text-primary flex items-center">
                      <IndianRupee className="h-4 w-4" />
                      {(wallet.addedBalance || 0).toFixed(2)}
                    </p>
                  </div>

                  {(wallet.pendingAddMoney || 0) > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-pending/10 to-amber-500/10 border border-pending/20">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-pending to-amber-500 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Approval</p>
                          <p className="font-semibold text-foreground">Add money requests</p>
                        </div>
                      </div>
                      <p className="font-display text-2xl font-bold text-pending flex items-center">
                        <IndianRupee className="h-4 w-4" />
                        {(wallet.pendingAddMoney || 0).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Trophy className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                        <p className="font-semibold text-foreground">Money withdrawn</p>
                      </div>
                    </div>
                    <p className="font-display text-2xl font-bold text-blue-500 flex items-center">
                      <IndianRupee className="h-4 w-4" />
                      {(wallet.totalWithdrawn || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Wallet data not available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Section */}
        <div className="mt-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant={timeRange === 'week' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeRange('week')}
                >
                  Week
                </Button>
                <Button 
                  variant={timeRange === 'month' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeRange('month')}
                >
                  Month
                </Button>
                <Button 
                  variant={timeRange === 'year' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setTimeRange('year')}
                >
                  Year
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Performance Chart</p>
                  <p className="text-muted-foreground">Your work performance over time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;