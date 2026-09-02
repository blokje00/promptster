import { withAuth, ok, fail } from '../utils/http/entry.ts';

// Only admins can download papers — withAuth's admin:true enforces that
// (403 for a non-admin user) before the handler runs.
Deno.serve(withAuth({ name: 'downloadResearchPaper', admin: true }, async ({ base44, body }) => {
    const { arxivId } = body || {};

    if (!arxivId) {
      return fail('arxivId required', 400);
    }

    // Construct arXiv PDF URL
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    
    console.log(`[downloadResearchPaper] Downloading ${arxivId} from ${pdfUrl}`);

    // Download PDF from arXiv
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      console.error(`[downloadResearchPaper] Failed to fetch from arXiv:`, response.status, response.statusText);
      return fail(`Failed to download paper: ${response.statusText}`, response.status);
    }

    const pdfBlob = await response.blob();
    const fileName = `research_${arxivId.replace(/\./g, '_')}.pdf`;

    console.log(`[downloadResearchPaper] Downloaded PDF, size: ${pdfBlob.size} bytes`);

    // Create a File object from the blob
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // Upload to private storage using service role
    console.log(`[downloadResearchPaper] Uploading to private storage...`);
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: file
    });

    console.log(`[downloadResearchPaper] ✓ Upload successful, file_uri:`, uploadResult.file_uri);

    // Store metadata in ResearchPaper entity
    console.log(`[downloadResearchPaper] Saving metadata to database...`);
    const existingPapers = await base44.asServiceRole.entities.ResearchPaper.filter({ arxiv_id: arxivId });
    
    const paperData = {
      arxiv_id: arxivId,
      file_uri: uploadResult.file_uri,
      downloaded_at: new Date().toISOString(),
      file_name: fileName,
      title: `Research Paper ${arxivId}`
    };

    let savedPaper;
    if (existingPapers.length > 0) {
      console.log(`[downloadResearchPaper] Updating existing paper record`);
      savedPaper = await base44.asServiceRole.entities.ResearchPaper.update(existingPapers[0].id, paperData);
    } else {
      console.log(`[downloadResearchPaper] Creating new paper record`);
      savedPaper = await base44.asServiceRole.entities.ResearchPaper.create(paperData);
    }

    console.log(`[downloadResearchPaper] Complete - Paper saved with ID:`, savedPaper.id);

    return ok({
      success: true,
      file_uri: uploadResult.file_uri,
      arxiv_id: arxivId,
      file_name: fileName,
      paper_id: savedPaper.id
    });
}));