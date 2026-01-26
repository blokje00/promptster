import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can download papers
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { arxivId } = await req.json();
    
    if (!arxivId) {
      return Response.json({ error: 'arxivId required' }, { status: 400 });
    }

    // Construct arXiv PDF URL
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    
    console.log(`[downloadResearchPaper] Downloading ${arxivId} from ${pdfUrl}`);

    // Download PDF from arXiv
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      return Response.json({ 
        error: `Failed to download paper: ${response.statusText}` 
      }, { status: response.status });
    }

    const pdfBuffer = await response.arrayBuffer();
    const fileName = `research_${arxivId.replace(/\./g, '_')}.pdf`;

    // Upload to private storage using service role
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: new Blob([pdfBuffer], { type: 'application/pdf' })
    });

    console.log(`[downloadResearchPaper] ✓ Uploaded ${fileName} to private storage`);

    // Store metadata in ResearchPaper entity
    const existingPapers = await base44.asServiceRole.entities.ResearchPaper.filter({ arxiv_id: arxivId });
    
    const paperData = {
      arxiv_id: arxivId,
      file_uri: uploadResult.file_uri,
      downloaded_at: new Date().toISOString(),
      file_name: fileName,
      title: `Research Paper ${arxivId}`
    };

    if (existingPapers.length > 0) {
      await base44.asServiceRole.entities.ResearchPaper.update(existingPapers[0].id, paperData);
    } else {
      await base44.asServiceRole.entities.ResearchPaper.create(paperData);
    }

    return Response.json({ 
      success: true,
      file_uri: uploadResult.file_uri,
      arxiv_id: arxivId,
      file_name: fileName
    });

  } catch (error) {
    console.error('[downloadResearchPaper] Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});