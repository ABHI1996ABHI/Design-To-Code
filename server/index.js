import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lightweight .env loader (avoids external dependency)
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) return;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed
        .slice(eqIndex + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch (err) {
    console.warn('Failed to load .env file:', err);
  }
}

const app = express();
const port = process.env.PORT || 8080;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn(
    '[WARN] OPENROUTER_API_KEY is not set. /api/generate-code requests will fail until it is configured.'
  );
}

app.use(express.json({ limit: '10mb' }));

app.post('/api/generate-code', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured on the server.' });
    }

    const { base64Image, userGuidance = '', previousCode = null, model, systemPrompt } = req.body;

    if (!base64Image || typeof base64Image !== 'string') {
      return res.status(400).json({ error: 'base64Image is required.' });
    }

    const mimeType = 'image/jpeg';
    const MODEL = model || 'openai/gpt-4o-mini';
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
    const normalizedImage =
      base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${base64Data}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE || 'Design-To-Code',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 6000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: normalizedImage } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, response.statusText, errorText);
      
      let errorDetails = errorText;
      let errorMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorDetails =
          parsed.error?.message ||
          parsed.error ||
          parsed.message ||
          parsed?.data ||
          errorText;
        errorMessage = parsed.error?.message || parsed.message || errorText;
      } catch {
        // Keep original errorText if not JSON
      }
      
      return res.status(502).json({
        error: 'OpenRouter API error',
        status: response.status,
        details: errorDetails,
        message: errorMessage,
      });
    }

    const data = await response.json();
    const messageContent = data?.choices?.[0]?.message?.content;

    let text = '';
    if (typeof messageContent === 'string') {
      text = messageContent;
    } else if (Array.isArray(messageContent)) {
      text = messageContent.find((part) => part?.type === 'text')?.text || '';
    } else if (messageContent?.text) {
      text = messageContent.text;
    }

    if (!text) {
      console.error('Unexpected OpenRouter response format:', JSON.stringify(data));
      return res.status(502).json({ error: 'Empty or unexpected OpenRouter response format.' });
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(text);
    } catch (err) {
      console.error('Failed to parse OpenRouter response text:', text);
      return res.status(502).json({ error: 'Unable to parse OpenRouter JSON response.' });
    }

    res.json(parsedJson);
  } catch (err) {
    console.error('Error in /api/generate-code:', err);
    res.status(500).json({
      error: 'Internal server error.',
      details: err?.message || 'Unknown error',
      cause: err?.cause?.message || undefined,
    });
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
