import { useMemo, useState } from "react";
import * as functions from "@/api/functions";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Users, Sparkles, FileText, Loader2, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Eye, Filter } from "lucide-react";
import { format, differenceInDays, startOfDay, endOfDay, subDays } from "date-fns";
import { nl } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

/**
 * Sortable table header component
 */
function SortableHeader({ field, label, sortField, sortDirection, onSort }) {
  const isActive = sortField === field;

  return (
    <th
      className="pb-2 font-semibold text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="w-3 h-3 text-indigo-600" />
          ) : (
            <ArrowDown className="w-3 h-3 text-indigo-600" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
        )}
      </div>
    </th>
  );
}

/**
 * Admin statistieken pagina - alleen zichtbaar voor admin/superuser.
 * Alle aggregatie gebeurt server-side in de getAdminStats functie;
 * de browser ontvangt één compacte payload i.p.v. 7 volledige tabellen.
 */
export default function AdminStats() {
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // TASK-2: Date range filter state
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30), // Default: last 30 days
    to: new Date()
  });

  const { currentUser } = useAuth();

  // Single server-side aggregated query (replaces 7 full-table downloads)
  const { data: adminData, isLoading } = useQuery({
    queryKey: ['adminStats', dateRange],
    queryFn: () => functions.getAdminStats({
      from: dateRange.from ? startOfDay(dateRange.from).toISOString() : null,
      to: dateRange.to ? endOfDay(dateRange.to).toISOString() : null,
    }),
    enabled: currentUser?.role === 'admin',
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const usersWithData = adminData?.users || [];
  const globalStats = adminData?.stats;

  // Sort users
  const sortedUsers = useMemo(() => {
    if (!sortField) return usersWithData;

    const sorted = [...usersWithData].sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case 'full_name':
          aVal = (a.full_name || '').toLowerCase();
          bVal = (b.full_name || '').toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'created_date':
          aVal = new Date(a.created_date || 0);
          bVal = new Date(b.created_date || 0);
          break;
        case 'items':
          aVal = a.itemsCount;
          bVal = b.itemsCount;
          break;
        case 'projects':
          aVal = a.projectsCount;
          bVal = b.projectsCount;
          break;
        case 'thoughts':
          aVal = a.thoughtsCount;
          bVal = b.thoughtsCount;
          break;
        case 'screenshots':
          aVal = a.screenshotsCount;
          bVal = b.screenshotsCount;
          break;
        case 'pageviews':
          aVal = a.pageViewsCount;
          bVal = b.pageViewsCount;
          break;
        case 'last_activity':
          aVal = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
          bVal = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [usersWithData, sortField, sortDirection]);

  // Admin access is already enforced by RouteGuard (routes.config.js: access "admin")

  if (isLoading || !globalStats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const stats = [
    {
      title: "Totaal Gebruikers",
      value: globalStats.totalUsers,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Totaal Items",
      value: globalStats.totalItems,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100",
      breakdown: globalStats.itemsBreakdown
    },
    {
      title: "Page Views",
      value: globalStats.analytics.totalViews,
      icon: Eye,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      breakdown: {
        sessions: globalStats.analytics.uniqueSessions,
        users: globalStats.analytics.uniqueUsers,
        avgTime: `${globalStats.analytics.avgTimePerPage}s`
      }
    },
    {
      title: "Totaal Thoughts",
      value: globalStats.totalThoughts,
      icon: Sparkles,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      breakdown: globalStats.thoughtsBreakdown
    },
  ];

  return (
    <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                    ADMIN ONLY
                  </Badge>
                </div>
                <p className="text-slate-600">Analytics, gebruikers & app statistieken (admin data gefilterd)</p>
              </div>

              {/* TASK-2: Date Range Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {dateRange.from && dateRange.to ? (
                      <>
                        {format(dateRange.from, 'd MMM', { locale: nl })} - {format(dateRange.to, 'd MMM yyyy', { locale: nl })}
                      </>
                    ) : (
                      <span>Filter dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b">
                    <p className="text-sm font-medium">Select date range</p>
                  </div>
                  <div className="p-3 space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      Last 30 days
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                    >
                      Last 90 days
                    </Button>
                  </div>
                  <div className="border-t p-3">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => range && setDateRange(range)}
                      numberOfMonths={2}
                      className="border-0"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    {stat.value}
                  </div>
                  {stat.breakdown && (
                    <div className="space-y-1">
                      {Object.entries(stat.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs text-slate-500">
                          <span className="capitalize">{key}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="w-5 h-5 text-indigo-600" />
                Gebruikers Overzicht
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr className="text-left">
                      <SortableHeader field="full_name" label="Naam" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="email" label="Email" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="created_date" label="Lid sinds" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="items" label="Items" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="projects" label="Projecten" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="thoughts" label="Thoughts" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="screenshots" label="Screenshots" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="pageviews" label="Views" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="last_activity" label="Laatst actief" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <th className="pb-2 font-semibold text-slate-700">Actions %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedUsers.map((user) => {
                      const createdDate = user.created_date ? new Date(user.created_date) : null;
                      const lastActivity = user.lastActivity ? new Date(user.lastActivity) : null;
                      const now = new Date();

                      // Server-aggregated task_checks stats
                      const checks = user.checks || { total: 0, success: 0, failed: 0, retried: 0 };
                      const safeDiv = (num, den) => den === 0 ? 0 : Math.round((num / den) * 100);

                      // Calculate days since last activity
                      const daysSinceActive = lastActivity
                        ? differenceInDays(now, lastActivity)
                        : null;

                      return (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="py-3">{user.full_name || "—"}</td>
                          <td className="py-3 text-slate-600 text-xs truncate max-w-[12rem]">{user.email}</td>
                          <td className="py-3">
                            {createdDate ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {format(createdDate, "d MMM yyyy", { locale: nl })}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="py-3 text-center">{user.itemsCount}</td>
                          <td className="py-3 text-center">{user.projectsCount}</td>
                          <td className="py-3 text-center">{user.thoughtsCount}</td>
                          <td className="py-3 text-center">{user.screenshotsCount}</td>
                          <td className="py-3 text-center">{user.pageViewsCount}</td>
                          <td className="py-3 text-xs">
                            {lastActivity ? (
                              <div className="flex flex-col items-start">
                                <span className="text-slate-700 font-medium">
                                  {format(lastActivity, "d MMM yyyy", { locale: nl })}
                                </span>
                                <span className={`text-xs ${
                                  daysSinceActive === 0 ? "text-green-600" :
                                  daysSinceActive <= 7 ? "text-blue-600" :
                                  daysSinceActive <= 30 ? "text-yellow-600" :
                                  "text-red-600"
                                }`}>
                                  {daysSinceActive === 0 ? "Vandaag" : `${daysSinceActive}d geleden`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Nooit</span>
                            )}
                          </td>
                          <td className="py-3 text-xs">
                             {checks.total > 0 ? (
                               <div className="flex flex-col gap-1">
                                 <span className="text-green-600">✓ {safeDiv(checks.success, checks.total)}%</span>
                                 <span className="text-red-500">✗ {safeDiv(checks.failed, checks.total)}%</span>
                                 <span className="text-orange-500">↻ {safeDiv(checks.retried, checks.total)}%</span>
                               </div>
                             ) : (
                               <span className="text-slate-400">-</span>
                             )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
}
