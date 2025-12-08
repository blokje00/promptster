import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, screenshot_urls } = await req.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // If no screenshots, just call InvokeLLM directly
    if (!screenshot_urls || screenshot_urls.length === 0) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt
      });
      return Response.json({ result });
    }

    // Fetch each screenshot and convert to Base64 data URL
    const base64Images = [];
    for (const url of screenshot_urls) {
      try {
        // Fetch the image from Base44 URL
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
          console.warn(`Failed to fetch screenshot: ${url}`);
          continue;
        }

        // Get the image as array buffer
        const arrayBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to base64
        const base64 = btoa(String.fromCharCode(...uint8Array));
        
        // Determine content type from URL or default to png
        const contentType = url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') 
          ? 'image/jpeg' 
          : 'image/png';
        
        // Create data URL
        const dataUrl = `data:${contentType};base64,${base64}`;
        base64Images.push(dataUrl);
      } catch (error) {
        console.error(`Error processing screenshot ${url}:`, error);
      }
    }

    // Call InvokeLLM with base64 data URLs (no JSON schema for text response)
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: base64Images.length > 0 ? base64Images : undefined
      // No response_json_schema - we want plain text response
    });

    return Response.json({ result });
  } catch (error) {
    console.error('Vision analysis error:', error);
    return Response.json({ 
      error: error.message || 'Vision analysis failed' 
    }, { status: 500 });
  }
});