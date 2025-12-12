import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Users, FolderOpen, Sparkles, FileText, Loader2, Calendar, Clock, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";

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
 * Toont overzicht van app gebruik.
 */
export default function AdminStats() {
  const [sortField, setSortField] = React.useState(null);
  const [sortDirection, setSortDirection] = React.useState('asc');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users || [];
    },
    enabled: currentUser?.role === 'admin',
  });

  const { data: allItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['allItems'],
    queryFn: async () => {
      const items = await base44.entities.Item.list();
      return items || [];
    },
    enabled: currentUser?.role === 'admin',
  });

  const { data: allProjects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['allProjects'],
    queryFn: async () => {
      const projects = await base44.entities.Project.list();
      return projects || [];
    },
    enabled: currentUser?.role === 'admin',
  });

  const { data: allThoughts = [], isLoading: loadingThoughts } = useQuery({
    queryKey: ['allThoughts'],
    queryFn: async () => {
      const thoughts = await base44.entities.Thought.list();
      return thoughts || [];
    },
    enabled: currentUser?.role === 'admin',
  });

  const { data: pageViews = [], isLoading: loadingViews } = useQuery({
    queryKey: ['pageViews'],
    queryFn: async () => {
      return await base44.entities.PageView.list('-created_date', 1000);
    },
    enabled: currentUser?.role === 'admin'
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter out admin user (patrick.van.zandvoort@gmail.com)
  const filteredUsers = useMemo(() => 
    allUsers.filter(u => u.email !== 'patrick.van.zandvoort@gmail.com'),
    [allUsers]
  );

  const filteredPageViews = useMemo(() =>
    pageViews.filter(pv => pv.user_email !== 'patrick.van.zandvoort@gmail.com'),
    [pageViews]
  );

  // Prepare user data with calculated fields
  const usersWithData = React.useMemo(() => {
    return filteredUsers.map(user => {
      const userItems = allItems.filter(i => i.created_by === user.email);
      const userProjects = allProjects.filter(p => p.created_by === user.email);
      return {
        ...user,
        itemsCount: userItems.length,
        projectsCount: userProjects.length,
        userItems,
        userProjects
      };
    });
  }, [filteredUsers, allItems, allProjects]);

  // Analytics stats
  const analyticsStats = useMemo(() => {
    const totalViews = filteredPageViews.length;
    const uniqueSessions = new Set(filteredPageViews.map(pv => pv.session_id)).size;
    const uniqueUsers = new Set(filteredPageViews.filter(pv => pv.user_id).map(pv => pv.user_id)).size;
    
    const totalTime = filteredPageViews.reduce((sum, pv) => sum + (pv.time_on_page || 0), 0);
    const avgTimePerPage = totalViews > 0 ? Math.round(totalTime / totalViews) : 0;

    return { totalViews, uniqueSessions, uniqueUsers, avgTimePerPage };
  }, [filteredPageViews]);

  // Sort users
  const sortedUsers = React.useMemo(() => {
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
        case 'plan_id':
          aVal = a.plan_id || '';
          bVal = b.plan_id || '';
          break;
        case 'subscription_status':
          aVal = a.subscription_status || 'none';
          bVal = b.subscription_status || 'none';
          break;
        case 'items':
          aVal = a.itemsCount;
          bVal = b.itemsCount;
          break;
        case 'projects':
          aVal = a.projectsCount;
          bVal = b.projectsCount;
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

  // Check admin access AFTER all hooks
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Geen Toegang</h2>
        <p className="text-slate-600 mt-2">Deze pagina is alleen toegankelijk voor administrators.</p>
      </div>
    );
  }

  const isLoading = loadingUsers || loadingItems || loadingProjects || loadingThoughts || loadingViews;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const stats = [
    {
      title: "Totaal Gebruikers",
      value: filteredUsers.length,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Totaal Items",
      value: allItems.length,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100",
      breakdown: {
        prompts: allItems.filter(i => i.type === 'prompt').length,
        multiprompts: allItems.filter(i => i.type === 'multiprompt').length,
        code: allItems.filter(i => i.type === 'code').length,
        snippets: allItems.filter(i => i.type === 'snippet').length,
      }
    },
    {
      title: "Page Views",
      value: analyticsStats.totalViews,
      icon: Eye,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      breakdown: {
        sessions: analyticsStats.uniqueSessions,
        users: analyticsStats.uniqueUsers,
        avgTime: `${analyticsStats.avgTimePerPage}s`
      }
    },
    {
      title: "Totaal Thoughts",
      value: allThoughts.length,
      icon: Sparkles,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      breakdown: {
        active: allThoughts.filter(t => !t.is_deleted).length,
        deleted: allThoughts.filter(t => t.is_deleted).length,
      }
    },
  ];

  return (
    <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
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
                      <SortableHeader field="plan_id" label="Plan" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="subscription_status" label="Subscription Status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <th className="pb-2 font-semibold text-slate-700">Trial Dates</th>
                      <SortableHeader field="items" label="Items" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <SortableHeader field="projects" label="Projecten" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                      <th className="pb-2 font-semibold text-slate-700">Groei %</th>
                      <th className="pb-2 font-semibold text-slate-700">Actions %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedUsers.map((user) => {
                      const userItems = user.userItems;
                      const userProjects = user.userProjects;
                      
                      // Calculate membership info using subscription_status field
                      const createdDate = user.created_date ? new Date(user.created_date) : null;
                      const trialStart = user.trial_start ? new Date(user.trial_start) : null;
                      const trialEnd = user.trial_end ? new Date(user.trial_end) : null;
                      const now = new Date();
                      
                      // Status labels matching Base44 Dashboard
                      const statusConfig = {
                        'none': { label: 'No Trial', color: 'bg-slate-100 text-slate-700', icon: null },
                        'trial': { 
                          label: trialEnd && trialEnd > now ? 'Trial Active' : 'Trial Expired', 
                          color: trialEnd && trialEnd > now ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700',
                          icon: Clock
                        },
                        'active': { label: 'Active', color: 'bg-green-100 text-green-700', icon: CreditCard },
                        'expired': { label: 'Expired', color: 'bg-red-100 text-red-700', icon: null },
                        'cancelled': { label: 'Cancelled', color: 'bg-orange-100 text-orange-700', icon: null }
                      };
                      
                      const currentStatus = statusConfig[user.subscription_status] || statusConfig['none'];
                      const StatusIcon = currentStatus.icon;

                      // CALCULATE GROWTH AND ACTIONS
                      const today = new Date();
                      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                      const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
                      
                      const itemsLast30 = userItems.filter(i => new Date(i.created_date) > thirtyDaysAgo);
                      const itemsPrev30 = userItems.filter(i => {
                          const d = new Date(i.created_date);
                          return d > sixtyDaysAgo && d <= thirtyDaysAgo;
                      });

                      const calcGrowth = (current, prev) => {
                          if (prev === 0) return current > 0 ? 100 : 0;
                          return Math.round(((current - prev) / prev) * 100);
                      };

                      const promptGrowth = calcGrowth(
                          itemsLast30.filter(i => i.type === 'prompt').length,
                          itemsPrev30.filter(i => i.type === 'prompt').length
                      );
                      const multiGrowth = calcGrowth(
                          itemsLast30.filter(i => i.type === 'multiprompt').length,
                          itemsPrev30.filter(i => i.type === 'multiprompt').length
                      );

                      // Actions Stats (from task_checks)
                      let totalChecks = 0;
                      let successChecks = 0;
                      let failedChecks = 0;
                      let retryChecks = 0;

                      userItems.forEach(item => {
                          if (item.task_checks) {
                              item.task_checks.forEach(check => {
                                  totalChecks++;
                                  if (check.status === 'success') successChecks++;
                                  if (check.status === 'failed') failedChecks++;
                                  if (check.status === 'retried') retryChecks++;
                              });
                          }
                      });

                      const safeDiv = (num, den) => den === 0 ? 0 : Math.round((num / den) * 100);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="py-3">{user.full_name || "—"}</td>
                          <td className="py-3 text-slate-600">{user.email}</td>
                          <td className="py-3">
                            {createdDate ? (
                              <div className="flex items-center gap-1 text-xs">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {format(createdDate, "d MMM yyyy", { locale: nl })}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="py-3">
                            <Badge variant={user.plan_id ? "default" : "secondary"}>
                              {user.plan_id || "Free"}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge className={currentStatus.color}>
                              {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                              {currentStatus.label}
                            </Badge>
                            <div className="text-xs text-slate-500 mt-1">
                              {user.subscription_status}
                            </div>
                          </td>
                          <td className="py-3 text-sm text-slate-600">
                            {trialStart && trialEnd ? (
                              <div className="space-y-0.5">
                                <div className="text-xs">Start: {format(trialStart, 'dd-MM-yyyy')}</div>
                                <div className="text-xs">End: {format(trialEnd, 'dd-MM-yyyy')}</div>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3">{userItems.length}</td>
                          <td className="py-3">{userProjects.length}</td>
                          <td className="py-3 text-xs">
                             <div className="flex flex-col gap-1">
                               <span className={promptGrowth > 0 ? "text-green-600" : "text-slate-500"}>Prompts: {promptGrowth > 0 ? '+' : ''}{promptGrowth}%</span>
                               <span className={multiGrowth > 0 ? "text-green-600" : "text-slate-500"}>Multi: {multiGrowth > 0 ? '+' : ''}{multiGrowth}%</span>
                             </div>
                          </td>
                          <td className="py-3 text-xs">
                             {totalChecks > 0 ? (
                               <div className="flex flex-col gap-1">
                                 <span className="text-green-600">Good: {safeDiv(successChecks, totalChecks)}%</span>
                                 <span className="text-red-500">Bad: {safeDiv(failedChecks, totalChecks)}%</span>
                                 <span className="text-orange-500">Retry: {safeDiv(retryChecks, totalChecks)}%</span>
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