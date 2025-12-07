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

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop() || 'png';
    const filename = `${user.id}_${timestamp}_${randomStr}.${ext}`;
    const path = `${user.id}/${filename}`;

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uploadUrl = `${supabaseUrl}/storage/v1/object/screenshots/${path}`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': file.type,
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      return Response.json({ error: 'Upload failed: ' + error }, { status: 500 });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/screenshots/${path}`;

    // Create ScreenshotAsset record
    const asset = await base44.asServiceRole.entities.ScreenshotAsset.create({
      user_id: user.id,
      project_id: projectId,
      task_id: taskId,
      bucket: 'screenshots',
      path: path,
      public_url: publicUrl,
      filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
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