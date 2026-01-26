import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { arxivId } = await req.json();
    
    if (!arxivId) {
      return Response.json({ error: 'arxivId required' }, { status: 400 });
    }

    // Retrieve metadata from AppSetting
    const metadataKey = `research_paper_${arxivId}`;
    const settings = await base44.asServiceRole.entities.AppSetting.filter({ key: metadataKey });

    if (settings.length === 0) {
      return Response.json({ 
        error: 'Paper not downloaded yet',
        fallback_url: `https://arxiv.org/abs/${arxivId}`
      }, { status: 404 });
    }

    const metadata = JSON.parse(settings[0].value);

    // Create signed URL for the private file (valid for 1 hour)
    const signedUrlResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: metadata.file_uri,
      expires_in: 3600 // 1 hour
    });

    return Response.json({ 
      success: true,
      signed_url: signedUrlResult.signed_url,
      arxiv_id: arxivId,
      downloaded_at: metadata.downloaded_at
    });

  } catch (error) {
    console.error('[getResearchPaperUrl] Error:', error);
    return Response.json({ 
      error: error.message,
      fallback_url: `https://arxiv.org/abs/${arxivId}`
    }, { status: 500 });
  }
});