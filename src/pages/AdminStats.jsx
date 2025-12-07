import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Users, FolderOpen, Sparkles, FileText, Loader2, Calendar, Clock, CreditCard } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import RequireSubscription from "../components/auth/RequireSubscription";

/**
 * Admin statistieken pagina - alleen zichtbaar voor admin/superuser.
 * Toont overzicht van app gebruik.
 */
export default function AdminStats() {
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

  // Redirect non-admins
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Geen Toegang</h2>
        <p className="text-slate-600 mt-2">Deze pagina is alleen toegankelijk voor administrators.</p>
      </div>
    );
  }

  const isLoading = loadingUsers || loadingItems || loadingProjects || loadingThoughts;

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
      value: allUsers.length,
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
      title: "Totaal Projecten",
      value: allProjects.length,
      icon: FolderOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
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
    <RequireSubscription>
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Admin Statistieken
              </h1>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                ADMIN ONLY
              </Badge>
            </div>
            <p className="text-slate-600">Applicatie statistieken en gebruik</p>
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
                      <th className="pb-2 font-semibold text-slate-700">Naam</th>
                      <th className="pb-2 font-semibold text-slate-700">Email</th>
                      <th className="pb-2 font-semibold text-slate-700">Lid sinds</th>
                      <th className="pb-2 font-semibold text-slate-700">Plan</th>
                      <th className="pb-2 font-semibold text-slate-700">Trial/Status</th>
                      <th className="pb-2 font-semibold text-slate-700">Items</th>
                      <th className="pb-2 font-semibold text-slate-700">Projecten</th>
                      <th className="pb-2 font-semibold text-slate-700">Groei %</th>
                      <th className="pb-2 font-semibold text-slate-700">Actions %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allUsers.map((user) => {
                      const userItems = allItems.filter(i => i.created_by === user.email);
                      const userProjects = allProjects.filter(p => p.created_by === user.email);
                      
                      // Calculate membership info
                      const createdDate = user.created_date ? new Date(user.created_date) : null;
                      const daysSinceCreation = createdDate ? differenceInDays(new Date(), createdDate) : 0;
                      const trialDaysLeft = 14 - daysSinceCreation;
                      const isTrialActive = trialDaysLeft > 0 && !user.subscription_status;
                      const isPaying = user.subscription_status === 'active' || user.plan_id === 'pro';
                      const daysPaying = isPaying && user.subscription_start_date 
                        ? differenceInDays(new Date(), new Date(user.subscription_start_date))
                        : 0;

                      // CALCULATE GROWTH AND ACTIONS
                      const now = new Date();
                      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
                      const sixtyDaysAgo = new Date(now.setDate(now.getDate() - 30)); // 60 days ago
                      
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
                            {isPaying ? (
                              <div className="flex items-center gap-1">
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  Betalend
                                </Badge>
                                <span className="text-xs text-slate-500">({daysPaying}d)</span>
                              </div>
                            ) : isTrialActive ? (
                              <Badge className={`${trialDaysLeft <= 3 ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}`}>
                                <Clock className="w-3 h-3 mr-1" />
                                Trial: {trialDaysLeft}d over
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">
                                Trial verlopen
                              </Badge>
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
    </RequireSubscription>
  );
}