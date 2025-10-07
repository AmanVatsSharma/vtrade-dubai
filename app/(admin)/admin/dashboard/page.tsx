// app/(admin)/admin/dashboard/page.tsx
'use client'
import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  LogOut, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Shield,
  Settings,
  Activity
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { WebSocketErrorBoundary } from '@/components/vortex/WebSocketErrorBoundary';

// Dynamically import LiveMarketQuotes to avoid SSR issues with WebSocket
const LiveMarketQuotes = dynamic(
  () => import('@/components/vortex/LiveMarketQuotes'),
  { ssr: false }
);

interface DashboardStats {
  totalUsers: number;
  pendingKYC: number;
  approvedKYC: number;
  rejectedKYC: number;
  totalTransactions: number;
  activeUsers: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingKYC: 0,
    approvedKYC: 0,
    rejectedKYC: 0,
    totalTransactions: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  // Check authentication and role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any)?.role;
      if (userRole !== 'ADMIN' && userRole !== 'MODERATOR') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch KYC stats
        const kycResponse = await fetch('/api/admin/kyc?limit=1');
        if (kycResponse.ok) {
          const kycData = await kycResponse.json();
          setStats(prev => ({
            ...prev,
            pendingKYC: kycData.statusCounts.PENDING || 0,
            approvedKYC: kycData.statusCounts.APPROVED || 0,
            rejectedKYC: kycData.statusCounts.REJECTED || 0,
            totalUsers: kycData.pagination.total || 0
          }));
        }

        // TODO: Add more API calls for other stats
        // const usersResponse = await fetch('/api/admin/users/stats');
        // const transactionsResponse = await fetch('/api/admin/transactions/stats');
        
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const userRole = (session?.user as any)?.role;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back, {session?.user?.name}</p>
              <Badge className="mt-1" variant="outline">
                <Shield className="w-3 h-3 mr-1" />
                {userRole}
              </Badge>
            </div>
            <Button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/kyc">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">KYC Management</p>
                    <p className="text-lg font-semibold text-gray-900">Review Applications</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">User Management</p>
                    <p className="text-lg font-semibold text-gray-900">Manage Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/transactions">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Transactions</p>
                    <p className="text-lg font-semibold text-gray-900">View Activity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Settings className="w-8 h-8 text-gray-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Settings</p>
                    <p className="text-lg font-semibold text-gray-900">System Config</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats.totalUsers}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending KYC</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats.pendingKYC}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Approved KYC</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats.approvedKYC}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected KYC</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? '...' : stats.rejectedKYC}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Market Quotes - WebSocket Integration */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Live Market Data</h2>
            <Badge variant="outline" className="ml-2">WebSocket</Badge>
          </div>
          <WebSocketErrorBoundary>
            <LiveMarketQuotes />
          </WebSocketErrorBoundary>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-500">Recent activity will be displayed here</p>
              <p className="text-sm text-gray-400 mt-2">This feature is coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

