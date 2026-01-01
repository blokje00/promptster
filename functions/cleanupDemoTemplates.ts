import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * One-time cleanup: Delete all PromptTemplates with "DEMO" in their name
 * ADMIN-ONLY function for data maintenance
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // ADMIN ONLY - verify user is authenticated and has admin role
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    console.log('[cleanupDemoTemplates] Starting cleanup...');
    
    // Fetch ALL templates (no user filter needed for admin cleanup)
    const allTemplates = await base44.asServiceRole.entities.PromptTemplate.list();
    console.log(`[cleanupDemoTemplates] Found ${allTemplates.length} total templates`);
    
    // Filter templates containing "DEMO" in name (case-insensitive)
    const demoTemplates = allTemplates.filter(t => 
      t.name && t.name.toUpperCase().includes('DEMO')
    );
    
    console.log(`[cleanupDemoTemplates] Found ${demoTemplates.length} DEMO templates to delete`);
    
    if (demoTemplates.length === 0) {
      return Response.json({
        status: 'success',
        message: 'No DEMO templates found',
        deleted: 0
      });
    }
    
    // Delete all DEMO templates using service role
    const deletePromises = demoTemplates.map(template => 
      base44.asServiceRole.entities.PromptTemplate.delete(template.id)
    );
    
    await Promise.all(deletePromises);
    
    console.log(`[cleanupDemoTemplates] ✓ Deleted ${demoTemplates.length} DEMO templates`);
    
    return Response.json({
      status: 'success',
      message: `Successfully deleted ${demoTemplates.length} DEMO templates`,
      deleted: demoTemplates.length,
      templates: demoTemplates.map(t => ({ id: t.id, name: t.name }))
    });
    
  } catch (error) {
    console.error('[cleanupDemoTemplates] Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});