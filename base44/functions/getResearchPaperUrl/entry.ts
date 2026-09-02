import { withAuth, ok, fail } from '../utils/http/entry.ts';

Deno.serve(withAuth({ name: 'getResearchPaperUrl' }, async ({ base44, body }) => {
    const { arxivId } = body || {};

    if (!arxivId) {
      return fail('arxivId required', 400);
    }

    // Retrieve metadata from ResearchPaper entity
    const papers = await base44.asServiceRole.entities.ResearchPaper.filter({ arxiv_id: arxivId });

    if (papers.length === 0) {
      return fail('Paper not downloaded yet', 404, {
        fallback_url: `https://arxiv.org/abs/${arxivId}`
      });
    }

    const metadata = papers[0];

    // Create signed URL for the private file (valid for 1 hour)
    const signedUrlResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: metadata.file_uri,
      expires_in: 3600 // 1 hour
    });

    return ok({
      success: true,
      signed_url: signedUrlResult.signed_url,
      arxiv_id: arxivId,
      downloaded_at: metadata.downloaded_at
    });
}));