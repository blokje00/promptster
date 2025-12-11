import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, Clock, TrendingUp, Loader2, MousePointerClick, Users } from "lucide-react";
import { format } from "date-fns";
import PageViewTracker from "../components/analytics/PageViewTracker";

export default function AdminAnalytics() {
  const navigate = useNavigate();

  // Fetch current user
  const { data: currentUser, isLoading: loadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch page views
  const { data: pageViews = [], isLoading: loadingViews } = useQuery({
    queryKey: ['pageViews'],
    queryFn: async () => {
      return await base44.entities.PageView.list('-created_date', 1000);
    },
    enabled: currentUser?.role === 'admin'
  });

  // Redirect non-admin users
  if (!loadingUser && currentUser?.role !== 'admin') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  if (loadingUser || loadingViews) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalViews = pageViews.length;
    const uniqueSessions = new Set(pageViews.map(pv => pv.session_id)).size;
    const uniqueUsers = new Set(pageViews.filter(pv => pv.user_id).map(pv => pv.user_id)).size;
    
    const totalTime = pageViews.reduce((sum, pv) => sum + (pv.time_on_page || 0), 0);
    const avgTimePerPage = totalViews > 0 ? Math.round(totalTime / totalViews) : 0;

    // Top pages
    const pageCount = {};
    pageViews.forEach(pv => {
      pageCount[pv.page_name] = (pageCount[pv.page_name] || 0) + 1;
    });
    const topPages = Object.entries(pageCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([page, count]) => ({ page, count }));

    // Average time per page
    const pageTime = {};
    const pageVisits = {};
    pageViews.forEach(pv => {
      if (pv.time_on_page > 0) {
        pageTime[pv.page_name] = (pageTime[pv.page_name] || 0) + pv.time_on_page;
        pageVisits[pv.page_name] = (pageVisits[pv.page_name] || 0) + 1;
      }
    });
    const avgTimeByPage = Object.entries(pageTime)
      .map(([page, time]) => ({
        page,
        avgTime: Math.round(time / pageVisits[page])
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Click paths (session-based navigation)
    const sessionPaths = {};
    pageViews
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .forEach(pv => {
        if (!sessionPaths[pv.session_id]) {
          sessionPaths[pv.session_id] = [];
        }
        sessionPaths[pv.session_id].push(pv.page_name);
      });

    // Find most common paths (2-page sequences)
    const pathCount = {};
    Object.values(sessionPaths).forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const pathKey = `${path[i]} → ${path[i + 1]}`;
        pathCount[pathKey] = (pathCount[pathKey] || 0) + 1;
      }
    });
    const topPaths = Object.entries(pathCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return {
      totalViews,
      uniqueSessions,
      uniqueUsers,
      avgTimePerPage,
      topPages,
      avgTimeByPage,
      topPaths
    };
  }, [pageViews]);

  return (
    <>
      <PageViewTracker />
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Track user behavior and engagement metrics</p>
            <Badge className="mt-2 bg-indigo-600">ADMIN ONLY</Badge>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Total Page Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.totalViews.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4" />
                  Unique Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.uniqueSessions.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Unique Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.uniqueUsers.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Avg Time/Page
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.avgTimePerPage}s
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Top Pages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topPages.map(({ page, count }, idx) => (
                    <div key={page} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 w-6">#{idx + 1}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{page}</span>
                      </div>
                      <Badge variant="outline">{count} views</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Average Time by Page */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Avg Time Spent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.avgTimeByPage.map(({ page, avgTime }, idx) => (
                    <div key={page} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 w-6">#{idx + 1}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{page}</span>
                      </div>
                      <Badge variant="outline">{avgTime}s</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Click Paths */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Common Navigation Paths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topPaths.map(({ path, count }, idx) => (
                    <div key={path} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-500 w-6">#{idx + 1}</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">{path}</span>
                      </div>
                      <Badge variant="outline">{count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Page Views Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Page Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-medium text-slate-600 dark:text-slate-400">Time</th>
                      <th className="pb-2 font-medium text-slate-600 dark:text-slate-400">Page</th>
                      <th className="pb-2 font-medium text-slate-600 dark:text-slate-400">User</th>
                      <th className="pb-2 font-medium text-slate-600 dark:text-slate-400">Duration</th>
                      <th className="pb-2 font-medium text-slate-600 dark:text-slate-400">Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pageViews.slice(0, 50).map((pv) => (
                      <tr key={pv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-2 text-slate-600 dark:text-slate-400">
                          {format(new Date(pv.created_date), 'dd-MM HH:mm')}
                        </td>
                        <td className="py-2 font-medium">{pv.page_name}</td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">
                          {pv.user_email || 'Anonymous'}
                        </td>
                        <td className="py-2 text-slate-600 dark:text-slate-400">
                          {pv.time_on_page > 0 ? `${pv.time_on_page}s` : '-'}
                        </td>
                        <td className="py-2 text-xs text-slate-400 font-mono">
                          {pv.session_id.substring(0, 12)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}