import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { screenshotId, prompt } = await req.json();

    if (!screenshotId) {
      return Response.json({ error: 'screenshotId required' }, { status: 400 });
    }

    // Fetch ScreenshotAsset
    const assets = await base44.asServiceRole.entities.ScreenshotAsset.filter({ 
      id: screenshotId 
    });

    if (!assets || assets.length === 0) {
      return Response.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    const asset = assets[0];

    // Fetch image from Supabase
    const imageResponse = await fetch(asset.public_url);
    if (!imageResponse.ok) {
      return Response.json({ error: 'Failed to fetch image' }, { status: 500 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const dataUrl = `data:${asset.content_type};base64,${base64Image}`;

    // Analyze with LLM Vision
    const analysisPrompt = prompt || "Describe this screenshot in detail. What UI elements, text, and functionality can you see?";
    
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      file_urls: [dataUrl]
    });

    return Response.json({
      screenshotId: screenshotId,
      analysis: result,
      publicUrl: asset.public_url
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});