import { withAuth, fail } from '../utils/http/entry.ts';

// TAAK-8: Authentication check before generating signed URL — withAuth
// handles that (401 without a user).
Deno.serve(withAuth({ name: 'serveImage' }, async ({ req, base44 }) => {
        const url = new URL(req.url);
        const uri = url.searchParams.get("uri");

        if (!uri) {
            return fail("Missing uri parameter", 400);
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

        return fail("Could not generate signed URL", 500);
}));