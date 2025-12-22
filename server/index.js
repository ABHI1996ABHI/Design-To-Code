import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!GEMINI_API_KEY) {
  console.warn(
    '[WARN] GEMINI_API_KEY is not set. /api/generate-code requests will fail until it is configured.'
  );
}

app.use(express.json({ limit: '10mb' }));

app.post('/api/generate-code', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { base64Image, userGuidance = '', previousCode = null, model, systemPrompt } = req.body;

    if (!base64Image || typeof base64Image !== 'string') {
      return res.status(400).json({ error: 'base64Image is required.' });
    }

    const mimeType = 'image/jpeg';
    const GEMINI_MODEL_VISION = model || 'gemini-3-pro-preview';
    const SYSTEM_PROMPT =
      systemPrompt ||
      'You are a world-class Lead Frontend Engineer. Return JSON with html, css, javascript.';

    let promptText = SYSTEM_PROMPT;

    if (previousCode) {
      promptText += `
\n### CURRENT CODE TO MODIFY:
HTML: ${previousCode.html}
CSS: ${previousCode.css}
JS: ${previousCode.javascript}

### NEW GUIDANCE:
${userGuidance}

Update the current code based on this guidance. Maintain the 1350px width and specified heading classes.`;
    } else {
      promptText += `\n### INITIAL GUIDANCE:\n${userGuidance || 'Follow the design exactly.'}`;
    }

    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_VISION}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                { inlineData: { mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 30000,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              html: { type: 'string' },
              css: { type: 'string' },
              javascript: { type: 'string' },
            },
            required: ['html', 'css', 'javascript'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, response.statusText, errorText);
      
      let errorDetails = errorText;
      let errorMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        // Gemini API error structure: { error: { message: "...", status: "..." } }
        errorDetails = parsed.error?.message || parsed.error?.status || parsed.message || errorText;
        errorMessage = parsed.error?.message || parsed.message || errorText;
      } catch {
        // Keep original errorText if not JSON
      }
      
      return res.status(502).json({
        error: 'Gemini API error',
        status: response.status,
        details: errorDetails,
        message: errorMessage,
      });
    }

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
      null;

    if (!text) {
      console.error('Unexpected Gemini response format:', JSON.stringify(data));
      return res.status(502).json({ error: 'Empty or unexpected Gemini response format.' });
    }

    res.json(JSON.parse(text));
  } catch (err) {
    console.error('Error in /api/generate-code:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Serve static assets (production)
const distDir = path.resolve(__dirname, '../dist');
app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

