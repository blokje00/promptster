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
        console.log(`Fetching screenshot: ${url}`);
        
        // Fetch the image from Base44 URL
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
          console.warn(`Failed to fetch screenshot: ${url}, status: ${imageResponse.status}`);
          continue;
        }

        console.log(`Successfully fetched ${url}, content-type: ${imageResponse.headers.get('content-type')}`);

        // Get the image as array buffer
        const arrayBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log(`Image size: ${uint8Array.length} bytes`);
        
        // Convert to base64
        const base64 = btoa(String.fromCharCode(...uint8Array));
        
        // Determine content type from URL or default to png
        const contentType = url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') 
          ? 'image/jpeg' 
          : 'image/png';
        
        // Create data URL
        const dataUrl = `data:${contentType};base64,${base64}`;
        base64Images.push(dataUrl);
        
        console.log(`Successfully converted image to base64 data URL (${base64.length} chars)`);
      } catch (error) {
        console.error(`Error processing screenshot ${url}:`, error);
      }
    }

    console.log(`Total images processed: ${base64Images.length}`);

    // Call InvokeLLM with base64 data URLs
    // IMPORTANT: When using file_urls, InvokeLLM expects a text response, not JSON
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: base64Images.length > 0 ? base64Images : undefined
    });

    console.log(`InvokeLLM result type: ${typeof result}`);

    return Response.json({ result });
  } catch (error) {
    console.error('Vision analysis error:', error);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: error.message || 'Vision analysis failed',
      details: error.stack
    }, { status: 500 });
  }
});