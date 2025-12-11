import React, { useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Eye, Clock, TrendingUp, Loader2, MousePointerClick, Users, AlertCircle } from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import { nl } from "date-fns/locale";
import RequireSubscription from "../components/auth/RequireSubscription";
import PageViewTracker from "../components/analytics/PageViewTracker";

/**
 * Admin analytics pagina - page views, klikpaden, time on page
 */
export default function AdminAnalytics() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: pageViews = [], isLoading } = useQuery({
    queryKey: ['pageViews'],
    queryFn: async () => {
      const views = await base44.entities.PageView.list('-created_date', 1000);
      return views || [];
    },
    enabled: currentUser?.role === 'admin',
  });

  // Redirect non-admins
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Geen Toegang</h2>
        <p className="text-slate-600 mt-2">Deze pagina is alleen toegankelijk voor administrators.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const totalViews = pageViews.length;
    const uniqueSessions = new Set(pageViews.map(v => v.session_id)).size;
    const uniqueUsers = new Set(pageViews.filter(v => v.user_email).map(v => v.user_email)).size;
    
    // Average time on page
    const viewsWithTime = pageViews.filter(v => v.time_on_page > 0);
    const avgTimeOnPage = viewsWithTime.length > 0
      ? Math.round(viewsWithTime.reduce((sum, v) => sum + v.time_on_page, 0) / viewsWithTime.length)
      : 0;

    // Page popularity
    const pageCount = {};
    pageViews.forEach(v => {
      pageCount[v.page_name] = (pageCount[v.page_name] || 0) + 1;
    });
    const topPages = Object.entries(pageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Time on page by page
    const timeByPage = {};
    pageViews.forEach(v => {
      if (v.time_on_page > 0) {
        if (!timeByPage[v.page_name]) {
          timeByPage[v.page_name] = { total: 0, count: 0 };
        }
        timeByPage[v.page_name].total += v.time_on_page;
        timeByPage[v.page_name].count += 1;
      }
    });
    const avgTimeByPage = Object.entries(timeByPage)
      .map(([page, data]) => ({
        page,
        avgTime: Math.round(data.total / data.count)
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // User journeys (click paths)
    const journeys = {};
    pageViews.forEach(v => {
      if (!journeys[v.session_id]) {
        journeys[v.session_id] = [];
      }
      journeys[v.session_id].push({
        page: v.page_name,
        timestamp: v.created_date,
        timeOnPage: v.time_on_page
      });
    });

    // Most common paths (first 3 pages)
    const paths = {};
    Object.values(journeys).forEach(journey => {
      const path = journey
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(0, 3)
        .map(j => j.page)
        .join(' → ');
      if (path) {
        paths[path] = (paths[path] || 0) + 1;
      }
    });
    const topPaths = Object.entries(paths)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      totalViews,
      uniqueSessions,
      uniqueUsers,
      avgTimeOnPage,
      topPages,
      avgTimeByPage,
      topPaths
    };
  }, [pageViews]);

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <RequireSubscription>
      <PageViewTracker />
      <div className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                ADMIN ONLY
              </Badge>
            </div>
            <p className="text-slate-600">Pagina views, klikpaden en gebruikersgedrag</p>
          </div>

          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Totaal Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.totalViews}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4" />
                  Sessies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.uniqueSessions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Unieke Gebruikers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.uniqueUsers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Gem. Tijd op Pagina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{formatTime(stats.avgTimeOnPage)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Top Pages by Views */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Populairste Pagina's
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topPages.map(([page, count], index) => (
                    <div key={page} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-400">#{index + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{page}</span>
                      </div>
                      <Badge variant="secondary">{count} views</Badge>
                    </div>
                  ))}
                  {stats.topPages.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">Nog geen data</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Average Time by Page */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Gem. Tijd per Pagina
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.avgTimeByPage.map(({ page, avgTime }, index) => (
                    <div key={page} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-400">#{index + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{page}</span>
                      </div>
                      <Badge variant="secondary">{formatTime(avgTime)}</Badge>
                    </div>
                  ))}
                  {stats.avgTimeByPage.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4">Nog geen data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Journeys / Click Paths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Meest Voorkomende Klikpaden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topPaths.map(([path, count], index) => (
                  <div key={path} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm font-semibold text-slate-400">#{index + 1}</span>
                      <span className="text-sm font-medium text-slate-700">{path}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      {count} {count === 1 ? 'gebruiker' : 'gebruikers'}
                    </Badge>
                  </div>
                ))}
                {stats.topPaths.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nog geen data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Page Views */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Recente Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold text-slate-700">Timestamp</th>
                      <th className="pb-2 font-semibold text-slate-700">Gebruiker</th>
                      <th className="pb-2 font-semibold text-slate-700">Pagina</th>
                      <th className="pb-2 font-semibold text-slate-700">Tijd op Pagina</th>
                      <th className="pb-2 font-semibold text-slate-700">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageViews.slice(0, 50).map((view) => (
                      <tr key={view.id} className="hover:bg-slate-50">
                        <td className="py-2 text-xs text-slate-500">
                          {format(new Date(view.created_date), "d MMM HH:mm:ss", { locale: nl })}
                        </td>
                        <td className="py-2 text-xs">
                          {view.user_email ? (
                            <span className="text-indigo-600">{view.user_email}</span>
                          ) : (
                            <span className="text-slate-400">Anoniem</span>
                          )}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline">{view.page_name}</Badge>
                        </td>
                        <td className="py-2 text-xs">
                          {view.time_on_page > 0 ? formatTime(view.time_on_page) : '—'}
                        </td>
                        <td className="py-2 text-xs text-slate-500">
                          {view.referrer ? view.referrer.substring(0, 30) + '...' : '—'}
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
    </RequireSubscription>
  );
}