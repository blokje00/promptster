import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Search, Loader2 } from "lucide-react";
import * as projects from "@/api/projects";
import * as templates from "@/api/templates";
import * as thoughts from "@/api/thoughts";
import * as items from "@/api/items";
import * as functions from "@/api/functions";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Only matches names/content/titles that START with "demo" (e.g. "DEMO project",
// "Demo: onboarding"), never a substring buried mid-sentence.
const DEMO_PREFIX_RE = /^\s*demo\b/i;
const isDemoText = (s) => typeof s === "string" && DEMO_PREFIX_RE.test(s);

export default function MaintenanceTools({ currentUser }) {
  const queryClient = useQueryClient();
  const [isFixing, setIsFixing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isScanningDemo, setIsScanningDemo] = useState(false);
  const [isDeletingDemo, setIsDeletingDemo] = useState(false);
  const [demoScan, setDemoScan] = useState(null); // { demoProjects, demoTemplates, demoThoughts, demoItems }

  const userNotLoaded = !currentUser?.email;

  // Step 1: scan only, no deletes. Records whose own name/content/title starts
  // with "demo", plus anything that hangs off a demo project (mirrors the
  // cascade useDeleteProject.jsx uses for a normal project delete).
  const handleScanDemoData = async () => {
    if (userNotLoaded) return;
    setIsScanningDemo(true);
    try {
      const [projectList, templateList, thoughtList, itemList] = await Promise.all([
        projects.listMine(currentUser.email),
        templates.listMine(currentUser.email),
        thoughts.listActive(currentUser.email),
        items.listMine(currentUser.email),
      ]);

      const demoProjects = projectList.filter((p) => isDemoText(p.name));
      const demoProjectIds = new Set(demoProjects.map((p) => p.id));
      const demoTemplates = templateList.filter((t) => isDemoText(t.name) || demoProjectIds.has(t.project_id));
      const demoThoughts = thoughtList.filter((t) => isDemoText(t.content) || demoProjectIds.has(t.project_id));
      const demoItems = itemList.filter((i) => isDemoText(i.title) || demoProjectIds.has(i.project_id));

      setDemoScan({ demoProjects, demoTemplates, demoThoughts, demoItems });

      const total = demoProjects.length + demoTemplates.length + demoThoughts.length + demoItems.length;
      if (total === 0) {
        toast.info("No DEMO-prefixed records found");
      }
    } catch (error) {
      console.error("[MaintenanceTools] Demo scan failed:", error);
      toast.error("Failed to scan for demo data");
      setDemoScan(null);
    } finally {
      setIsScanningDemo(false);
    }
  };

  // Step 2: actually delete what the scan found. Thoughts are soft-deleted
  // (is_deleted/deleted_at) like every other Thought deletion in this app
  // (see RecycleBin.jsx, useDeleteProject.jsx); Item has no soft-delete field
  // so items, templates and projects are hard-deleted, same as ItemCard.jsx /
  // TemplatesManager.jsx / useDeleteProject.jsx do.
  const handleConfirmDeleteDemoData = async () => {
    if (userNotLoaded || !demoScan) return;
    setIsDeletingDemo(true);
    const { demoProjects, demoTemplates, demoThoughts, demoItems } = demoScan;

    try {
      const results = await Promise.allSettled([
        ...demoThoughts.map((t) => thoughts.softDelete(t.id)),
        ...demoTemplates.map((t) => templates.remove(t.id)),
        ...demoItems.map((i) => items.remove(i.id)),
        ...demoProjects.map((p) => projects.remove(p.id)),
      ]);

      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.length - failed.length;

      if (failed.length > 0) {
        console.error(
          "[MaintenanceTools] Demo cleanup partial failure:",
          failed.map((f) => f.reason)
        );
        toast.error(`Deleted ${succeeded}/${results.length} DEMO records — ${failed.length} failed (see console)`);
      } else if (succeeded > 0) {
        toast.success(
          `Deleted ${succeeded} DEMO records (${demoProjects.length} projects, ${demoThoughts.length} tasks, ${demoTemplates.length} templates, ${demoItems.length} items)`
        );
      }

      queryClient.invalidateQueries({ queryKey: ["activeThoughts"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["deletedThoughts"] });

      setDemoScan(null);
    } catch (error) {
      console.error("[MaintenanceTools] Demo cleanup failed:", error);
      toast.error("Failed to delete demo data");
    } finally {
      setIsDeletingDemo(false);
    }
  };

  const handleFixVault = async () => {
    setIsFixing(true);
    try {
      const data = await functions.fixVaultTasks();

      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['openTasksCount'] });
      } else {
        toast.error("Fix failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to run fix script");
    } finally {
      setIsFixing(false);
    }
  };

  const runCleanup = async () => {
    if (!currentUser) return;

    setIsRunning(true);
    try {
      const data = await functions.hardDeleteOldTasks();

      if (data.success) {
        toast.success(data.message);
        setShowConfirm(false);
        queryClient.invalidateQueries({ queryKey: ['items'] });
      } else {
        toast.error("Cleanup failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      toast.error("Failed to run cleanup");
    } finally {
      setIsRunning(false);
    }
  };

  const demoTotal = demoScan
    ? demoScan.demoProjects.length + demoScan.demoTemplates.length + demoScan.demoThoughts.length + demoScan.demoItems.length
    : 0;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Wrench className="w-5 h-5" />
          Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleFixVault} disabled={isFixing} className="bg-orange-600 hover:bg-orange-700 text-white">
          {isFixing ? "Fixing..." : "Fix Vault Data (Set all to Success)"}
        </Button>
        <p className="text-xs text-orange-600 mt-2">
          Use this once to mark all pending tasks as success and reset the Vault counter.
        </p>

        <div className="mt-4 border-t border-orange-200 pt-4">
          <h4 className="text-sm font-bold text-orange-800 mb-2">Demo Data</h4>

          {!demoScan ? (
            <>
              <Button
                onClick={handleScanDemoData}
                disabled={isScanningDemo || userNotLoaded}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                {isScanningDemo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" /> Scan for DEMO data
                  </>
                )}
              </Button>
              <p className="text-xs text-orange-600 mt-2">
                {userNotLoaded
                  ? "Waiting for your account to load before this can run…"
                  : "Finds projects, tasks, templates and vault items whose name starts with “DEMO” (and anything under a DEMO project). Nothing is deleted yet."}
              </p>
            </>
          ) : (
            <div className="space-y-2">
              {demoTotal === 0 ? (
                <p className="text-xs text-orange-700">No DEMO-prefixed records found.</p>
              ) : (
                <div className="text-xs text-orange-800 bg-orange-100 rounded p-2 space-y-1">
                  <p className="font-medium">Found {demoTotal} record(s) to remove:</p>
                  <ul className="list-disc ml-4">
                    {demoScan.demoProjects.length > 0 && <li>{demoScan.demoProjects.length} project(s): {demoScan.demoProjects.map(p => p.name).join(", ")}</li>}
                    {demoScan.demoThoughts.length > 0 && <li>{demoScan.demoThoughts.length} task(s)</li>}
                    {demoScan.demoTemplates.length > 0 && <li>{demoScan.demoTemplates.length} template(s): {demoScan.demoTemplates.map(t => t.name).join(", ")}</li>}
                    {demoScan.demoItems.length > 0 && <li>{demoScan.demoItems.length} vault item(s): {demoScan.demoItems.map(i => i.title).join(", ")}</li>}
                  </ul>
                </div>
              )}
              <div className="flex items-center gap-2">
                {demoTotal > 0 && (
                  <Button
                    onClick={handleConfirmDeleteDemoData}
                    disabled={isDeletingDemo || userNotLoaded}
                    variant="destructive"
                    size="sm"
                  >
                    {isDeletingDemo ? "Deleting..." : `Verwijder ${demoTotal} records`}
                  </Button>
                )}
                <Button
                  onClick={() => setDemoScan(null)}
                  disabled={isDeletingDemo}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-orange-200 pt-4">
          <h4 className="text-sm font-bold text-orange-800 mb-2">Hard Delete Cleanup</h4>
          <div className="flex items-center gap-3">
            {!showConfirm ? (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={isRunning}
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                Hard Delete Cleanup (&gt;30 days)
              </Button>
            ) : (
              <>
                <Button
                  onClick={runCleanup}
                  disabled={isRunning}
                  variant="destructive"
                  size="sm"
                >
                  {isRunning ? "Cleaning..." : "Yes, Delete My Old Tasks"}
                </Button>
                <Button
                  onClick={() => setShowConfirm(false)}
                  disabled={isRunning}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            )}
            <span className="text-xs text-slate-500">Your tasks only</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
