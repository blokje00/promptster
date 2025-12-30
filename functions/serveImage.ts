import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // TAAK-8: Authentication check before generating signed URL
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const url = new URL(req.url);
        const uri = url.searchParams.get("uri");

        if (!uri) {
            return Response.json({ error: "Missing uri parameter" }, { status: 400 });
        }

        // Generate signed URL using service role (public access proxy)
        // This fulfills the requirement for "Permanent URLs" by generating a fresh valid link on every access.
        // We use 7 days (604800 seconds) which is typically the maximum allowed for signed URLs,
        // ensuring the link remains valid during long LLM sessions even if cached.
        const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
            file_uri: uri,
            expires_in: 604800 
        });

        if (result && result.signed_url) {
            return Response.redirect(result.signed_url);
        }

        return Response.json({ error: "Could not generate signed URL" }, { status: 500 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});