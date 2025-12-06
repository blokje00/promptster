import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import JSZip from 'npm:jszip@3.10.1';
import { Parser } from 'npm:@json2csv/plainjs@6.1.3';

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

    // 1. Fetch Data
    // We fetch all items for the user to ensure we can filter correctly in memory (flexible)
    // Alternatively, we could filter in DB query if supported. 
    // Base44 filter is simple equality usually, range queries might be limited.
    // Fetching all for user is safe enough for "user level export".
    let items = await base44.entities.Item.filter({ created_by: user.email });

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

    // 3. Prepare Data Structures
    const exportItems = items.map(i => ({
      item_id: i.id,
      type: i.type,
      title: i.title,
      project_id: i.project_id || '',
      project_name: '', // We might need to fetch projects to populate this, or leave empty/ID. Requirement says project_name.
      created_at: i.created_date,
      updated_at: i.updated_date,
      status: i.status,
      aantal_checks: i.task_checks ? i.task_checks.length : 0
    }));
    
    // Fetch project names if needed? 
    // To be efficient, let's fetch all projects for user once.
    const projects = await base44.entities.Project.filter({ created_by: user.email });
    const projectMap = projects.reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});
    
    exportItems.forEach(i => {
      i.project_name = projectMap[i.project_id] || '';
    });

    // Prepare Task Checks
    let exportChecks = [];
    items.forEach(item => {
      if (item.task_checks && Array.isArray(item.task_checks)) {
        item.task_checks.forEach((check, index) => {
            
          // Check Status Filter (Only applies to Checks export/view)
          if (checkStatusFilter && checkStatusFilter !== 'all') {
             const status = check.status || 'open';
             if (status !== checkStatusFilter) return;
          }

          exportChecks.push({
            item_id: item.id,
            check_index: index,
            task_name: check.task_name || '',
            full_description: check.full_description || '',
            status: check.status || 'open',
            is_checked: check.is_checked || false,
            created_at: check.created_date || item.created_date, // Fallback
            updated_at: check.updated_date || item.updated_date  // Fallback
          });
        });
      }
    });

    // 4. Generate Output
    if (format === 'json') {
      const jsonOutput = {
        metadata: {
            generated_at: new Date().toISOString(),
            user: user.email,
            scope,
            counts: {
                items: exportItems.length,
                checks: exportChecks.length
            }
        },
        items: exportItems,
        task_checks: exportChecks
      };
      
      return new Response(JSON.stringify(jsonOutput, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="export_${scope}_${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } else {
      // CSV Format - Zip
      const zip = new JSZip();
      
      const parser = new Parser();
      const csvItems = exportItems.length ? parser.parse(exportItems) : '';
      const csvChecks = exportChecks.length ? parser.parse(exportChecks) : '';

      zip.file("items.csv", csvItems);
      zip.file("task_checks.csv", csvChecks);

      const content = await zip.generateAsync({ type: "uint8array" });

      return new Response(content, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="export_${scope}_${new Date().toISOString().split('T')[0]}.zip"`
        }
      });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

Deno.serve(exportUserData);