import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const projectId = formData.get('projectId') || null;
    const taskId = formData.get('taskId') || null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload via Base44 Core integration
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    
    if (!uploadResult?.file_url) {
      return Response.json({ error: 'Upload failed' }, { status: 500 });
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

    return Response.json({
      screenshotId: asset.id,
      publicUrl: publicUrl,
      asset: asset
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});