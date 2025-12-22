
import { GEMINI_MODEL_VISION, SYSTEM_PROMPT } from '../constants';
import { GeneratedCode } from '../types';

async function optimizeImage(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // More aggressive size limits to reduce token usage
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1600;
      const MAX_AREA = 1920000; // 1200 * 1600
      
      // Calculate scaling to fit within max dimensions
      const currentArea = width * height;
      if (currentArea > MAX_AREA) {
        const scale = Math.sqrt(MAX_AREA / currentArea);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }
      
      // Ensure width and height don't exceed individual limits
      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }
      if (height > MAX_HEIGHT) {
        width = (MAX_HEIGHT / height) * width;
        height = MAX_HEIGHT;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      // Try progressively lower quality until we get under size limit
      let quality = 0.7;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let base64Size = dataUrl.length;
      
      // Target: keep base64 size under ~1.5MB (Gemini has input token limits)
      const MAX_BASE64_SIZE = 1500000;
      
      while (base64Size > MAX_BASE64_SIZE && quality > 0.3) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        base64Size = dataUrl.length;
      }
      
      // If still too large, reduce dimensions further
      if (base64Size > MAX_BASE64_SIZE) {
        const reductionFactor = Math.sqrt(MAX_BASE64_SIZE / base64Size);
        width = Math.floor(width * reductionFactor);
        height = Math.floor(height * reductionFactor);
        canvas.width = width;
        canvas.height = height;
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      }
      
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('Failed to load image for optimization'));
    img.src = base64;
  });
}

const getApiBase = () => {
  // Optional override for extension/other environments
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return explicit.replace(/\/+$/, '');
  return '';
};

export const generateCodeFromDesign = async (
  base64Image: string,
  userGuidance: string = '',
  previousCode: GeneratedCode | null = null
): Promise<GeneratedCode> => {
  try {
    const optimizedBase64 = await optimizeImage(base64Image);
    
    // Validate optimized image size (base64 is ~33% larger than binary)
    const base64Size = optimizedBase64.length;
    const MAX_BASE64_SIZE = 2000000; // ~1.5MB binary = ~2MB base64
    
    if (base64Size > MAX_BASE64_SIZE) {
      throw new Error(
        `Image is too large (${Math.round(base64Size / 1024)}KB) even after optimization. ` +
        `Please use a smaller image or simpler design. Maximum recommended size: ${Math.round(MAX_BASE64_SIZE / 1024)}KB.`
      );
    }

    const response = await fetch(`${getApiBase()}/api/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64Image: optimizedBase64,
        userGuidance,
        previousCode,
        model: GEMINI_MODEL_VISION,
        systemPrompt: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      let errorText = await response.text();
      let errorDetails: any = {};
      
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        // If not JSON, use the text as-is
      }
      
      // Extract meaningful error message from Gemini API response
      // Gemini API errors can be nested in different structures
      const geminiError = 
        errorDetails?.error?.message || 
        errorDetails?.error?.status || 
        errorDetails?.message ||
        errorDetails?.details || 
        errorText;
      
      // Check for specific token-related errors
      const errorLower = String(geminiError).toLowerCase();
      if (errorLower.includes('token') || 
          errorLower.includes('too large') || 
          errorLower.includes('quota') ||
          errorLower.includes('exceeded') ||
          errorLower.includes('limit')) {
        throw new Error(
          `Image too large for processing. The design is too complex for the current token budget. ` +
          `Please try a smaller image, simpler design, or reduce the image resolution. ` +
          `Error details: ${geminiError}`
        );
      }
      
      throw new Error(
        `Backend error (${response.status} ${response.statusText}): ${geminiError}`
      );
    }

    return (await response.json()) as GeneratedCode;
  } catch (error: any) {
    console.error('Gemini Generation Error:', error);
    throw error;
  }
};
