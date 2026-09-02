import { withAuth, ok, fail } from '../utils/http/entry.ts';

// withAuth only parses JSON bodies (by content-type), so the multipart body
// of this upload request is still available here via req.formData().
Deno.serve(withAuth({ name: 'uploadScreenshot' }, async ({ req, base44, user }) => {
  const formData = await req.formData();
  const file = formData.get('file');
  const projectId = formData.get('projectId') || null;
  const taskId = formData.get('taskId') || null;

  if (!file) {
    return fail('No file provided', 400);
  }

  // Upload via Base44 Core integration
  const uploadResult = await base44.integrations.Core.UploadFile({ file });

  if (!uploadResult?.file_url) {
    return fail('Upload failed', 500);
  }

  const publicUrl = uploadResult.file_url;

  // Extract filename and create path reference
  const filename = file.name || 'screenshot.png';
  const timestamp = Date.now();
  const path = `screenshots/${user.id}/${timestamp}_${filename}`;

  // Create ScreenshotAsset record
  const asset = await base44.asServiceRole.entities.ScreenshotAsset.create({
    user_id: user.id,
    project_id: projectId,
    task_id: taskId,
    bucket: 'base44-files',
    path: path,
    public_url: publicUrl,
    filename: filename,
    content_type: file.type || 'image/png',
    size_bytes: file.size || 0,
    created_by: user.email
  });

  return ok({
    screenshotId: asset.id,
    publicUrl: publicUrl,
    asset: asset
  });
}));
