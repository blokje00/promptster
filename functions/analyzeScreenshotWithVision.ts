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

    console.log(`Analyzing ${screenshot_urls.length} screenshots with prompt: ${prompt.substring(0, 100)}...`);

    // Try direct URLs first (Base44 should handle them)
    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: screenshot_urls,
        add_context_from_internet: false
      });
      
      console.log(`Vision analysis successful`);
      return Response.json({ result });
    } catch (directError) {
      console.log(`Direct URL approach failed: ${directError.message}`);
      
      // Fallback: Fetch and convert to Base64
      console.log('Attempting Base64 conversion fallback...');
      
      const base64Images = [];
      for (const url of screenshot_urls) {
        try {
          console.log(`Fetching screenshot: ${url}`);
          
          const imageResponse = await fetch(url);
          if (!imageResponse.ok) {
            console.warn(`Failed to fetch screenshot: ${url}, status: ${imageResponse.status}`);
            continue;
          }

          const arrayBuffer = await imageResponse.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          console.log(`Fetched ${uint8Array.length} bytes`);
          
          // Convert to base64
          const base64 = btoa(String.fromCharCode(...uint8Array));
          
          // Determine content type
          const contentType = url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg') 
            ? 'image/jpeg' 
            : 'image/png';
          
          const dataUrl = `data:${contentType};base64,${base64}`;
          base64Images.push(dataUrl);
          
          console.log(`Converted to base64 data URL`);
        } catch (error) {
          console.error(`Error processing screenshot ${url}:`, error);
        }
      }

      if (base64Images.length === 0) {
        throw new Error('No screenshots could be processed');
      }

      console.log(`Calling InvokeLLM with ${base64Images.length} base64 images...`);
      
      // Try with Base64
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: base64Images
      });

      return Response.json({ result });
    }
  } catch (error) {
    console.error('Vision analysis error:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      status: error.status,
      data: error.data
    });
    
    return Response.json({ 
      error: error.message || 'Vision analysis failed',
      type: error.name,
      details: error.data
    }, { status: 500 });
  }
});