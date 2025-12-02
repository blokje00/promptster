import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const url = new URL(req.url);
        const uri = url.searchParams.get("uri");

        if (!uri) {
            return Response.json({ error: "Missing uri parameter" }, { status: 400 });
        }

        // Generate signed URL using service role (public access proxy)
        // Note: expires_in is short (1 hour) because this proxy generates a FRESH link on every request.
        // The proxy URL itself acts as the permanent link.
        // Long expirations (e.g. 10 years) often fail due to provider limits (max 7 days).
        const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
            file_uri: uri,
            expires_in: 3600 
        });

        if (result && result.signed_url) {
            return Response.redirect(result.signed_url);
        }

        return Response.json({ error: "Could not generate signed URL" }, { status: 500 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});