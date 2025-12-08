import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';
import { Parser } from 'npm:@json2csv/plainjs@6.1.3';

/**
 * PROMPTSTER EXPORT FUNCTION
 * 
 * Purpose: Export Vault items and Checks in CSV (zip) or JSON format
 * 
 * Data Structure:
 * - items.csv: One row per Vault item with project info, status, and check count
 * - checks.csv: One row per individual check with full context (replaces task_checks.csv)
 * 
 * Integrity: aantal_checks in items.csv must match actual check count in checks.csv
 * 
 * Filters: Date range, item type, check status - all workspace-scoped
 */

export const exportUserData = async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { format = 'csv', scope = 'vault', itemId, filters = {} } = await req.json();
    const { dateRange, typeFilter, checkStatusFilter } = filters;

    // 1. Fetch Data (workspace-scoped)
    // Only fetch items belonging to current user's workspace
    // Filter out demo/seed data without valid workspace
    let items = await base44.entities.Item.filter({ created_by: user.email });
    
    // TODO: Add workspace_id filtering when workspace support is fully implemented
    // items = items.filter(i => i.workspace_id === user.workspace_id);

    // 2. Apply Filters
    // Scope Filter
    if (scope === 'single_item' && itemId) {
      items = items.filter(i => i.id === itemId);
    }

    // Type Filter (All Items, Multiprompts, Single Prompts)
    if (typeFilter && typeFilter !== 'all') {
      if (typeFilter === 'multiprompt') {
        items = items.filter(i => i.type === 'multiprompt');
      } else if (typeFilter === 'single') {
        items = items.filter(i => i.type !== 'multiprompt');
      }
    }

    // Date Filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0,0,0,0));
          break;
        case '7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'prevMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'custom':
          if (filters.customStart) startDate = new Date(filters.customStart);
          break;
      }

      if (startDate) {
        items = items.filter(i => new Date(i.created_date) >= startDate);
      }
      
      if (dateRange === 'custom' && filters.customEnd) {
         const endDate = new Date(filters.customEnd);
         endDate.setHours(23, 59, 59, 999);
         items = items.filter(i => new Date(i.created_date) <= endDate);
      }
      
      // Handle 'prevMonth' end date logic if needed, but 'thisMonth' logic implies start date filter is enough?
      // Actually 'prevMonth' needs an upper bound too.
      if (dateRange === 'prevMonth') {
         const endDate = new Date(new Date().getFullYear(), new Date().getMonth(), 0); // Last day of prev month
         endDate.setHours(23, 59, 59, 999);
         items = items.filter(i => new Date(i.created_date) <= endDate);
      }
    }

    // 3. Fetch Projects for Name Resolution
    const projects = await base44.entities.Project.filter({ created_by: user.email });
    const projectMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});

    // 4. Prepare Items Export Structure
    // Columns: item_id, workspace_id, workspace_name, project_id, project_name, 
    //          type, title, status, aantal_checks, created_at, updated_at
    const exportItems = items.map(i => {
      const aantal_checks = (i.task_checks && Array.isArray(i.task_checks)) ? i.task_checks.length : 0;
      
      return {
        item_id: i.id,
        workspace_id: '', // TODO: Populate when workspace support added
        workspace_name: '', // TODO: Populate when workspace support added
        project_id: i.project_id || '',
        project_name: projectMap[i.project_id] || '',
        type: i.type || '',
        title: i.title || '',
        status: i.status || 'open',
        aantal_checks: aantal_checks,
        created_at: i.created_date || '',
        updated_at: i.updated_date || ''
      };
    });

    // 5. Prepare Checks Export Structure (NEW: Replaces task_checks.csv)
    // Columns: check_id, item_id, item_title, item_type, project_id, project_name,
    //          check_index, check_key, check_label, check_status, created_at, updated_at
    let exportChecks = [];
    
    items.forEach(item => {
      if (!item.task_checks || !Array.isArray(item.task_checks)) return;
      
      item.task_checks.forEach((check, index) => {
        const status = check.status || 'open';
        
        // Apply Check Status Filter
        if (checkStatusFilter && checkStatusFilter !== 'all') {
          if (status !== checkStatusFilter) return;
        }

        // Generate stable check_id (item_id + index)
        const check_id = `${item.id}_check_${index + 1}`;
        
        exportChecks.push({
          check_id: check_id,
          item_id: item.id,
          item_title: item.title || '',
          item_type: item.type || '',
          project_id: item.project_id || '',
          project_name: projectMap[item.project_id] || '',
          check_index: index + 1, // 1-based for human readability
          check_key: check.task_name || `check_${index + 1}`,
          check_label: check.task_name || check.full_description?.substring(0, 100) || `Check ${index + 1}`,
          check_status: status,
          created_at: check.created_date || item.created_date || '',
          updated_at: check.updated_date || item.updated_date || ''
        });
      });
    });
    
    // 6. Integrity Check: aantal_checks must match actual checks
    const checksMap = exportChecks.reduce((acc, check) => {
      acc[check.item_id] = (acc[check.item_id] || 0) + 1;
      return acc;
    }, {});
    
    exportItems.forEach(item => {
      const actualCount = checksMap[item.item_id] || 0;
      if (item.aantal_checks !== actualCount) {
        console.warn(`Integrity mismatch for item ${item.item_id}: Expected ${item.aantal_checks} checks, found ${actualCount}`);
        // Auto-correct
        item.aantal_checks = actualCount;
      }
    });

    // 7. Generate Output
    if (format === 'json') {
      // JSON Export: Clean structured format
      const jsonOutput = {
        metadata: {
          generated_at: new Date().toISOString(),
          user: user.email,
          workspace: 'default', // TODO: Add workspace info
          scope,
          filters: {
            dateRange,
            typeFilter,
            checkStatusFilter
          },
          counts: {
            items: exportItems.length,
            checks: exportChecks.length
          }
        },
        items: exportItems,
        checks: exportChecks // Renamed from task_checks
      };
      
      return new Response(JSON.stringify(jsonOutput, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="promptster_export_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } else {
      // CSV Export: ZIP with items.csv + checks.csv
      const zip = new JSZip();
      
      const parser = new Parser();
      
      // UTF-8 BOM for Excel compatibility
      const BOM = '\uFEFF';
      
      const csvItems = exportItems.length ? BOM + parser.parse(exportItems) : BOM + 'No items';
      const csvChecks = exportChecks.length ? BOM + parser.parse(exportChecks) : BOM + 'No checks';

      zip.file("items.csv", csvItems);
      zip.file("checks.csv", csvChecks); // RENAMED from task_checks.csv

      const content = await zip.generateAsync({ type: "uint8array" });

      return new Response(content, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="promptster_export_${new Date().toISOString().split('T')[0]}.zip"`
        }
      });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

Deno.serve(exportUserData);