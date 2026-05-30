// useClaudeAPI — streaming OpenAI Chat Completions integration
// (Hook name preserved for backward compatibility with existing imports.)
// Makes direct fetch calls from the renderer (no CORS in Electron)
// Injects full master prompt as the system message on every call.

import { useState, useCallback, useRef } from 'react';
import MASTER_PROMPT from '../constants/masterPrompt';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';
const MAX_TOKENS = 4000;

// Convert Anthropic-style messages (string or content-block array) to OpenAI string content.
function flattenContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (typeof b === 'string' ? b : b?.text || ''))
      .join('');
  }
  return String(content ?? '');
}

function toOpenAIMessages(messages) {
  return [
    { role: 'system', content: MASTER_PROMPT },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: flattenContent(m.content),
    })),
  ];
}

// Retry on transient overload (429/503) with exponential backoff.
async function fetchWithRetry(url, options, maxRetries = 4) {
  let delay = 3000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429 && response.status !== 503) return response;
    if (attempt < maxRetries) {
      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(delay * 2, 30000);
    }
  }
  return fetch(url, options);
}

export function useClaudeAPI() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const stream = useCallback(async ({
    apiKey,
    messages,
    onChunk,
    onComplete,
    onError,
  }) => {
    if (!apiKey) {
      const err = 'No API key configured.';
      setError(err);
      onError?.(err);
      return;
    }

    setIsStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: toOpenAIMessages(messages),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const msg = body?.error?.message || `API error: ${response.status}`;
        throw new Error(msg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            const chunk = event?.choices?.[0]?.delta?.content;
            if (chunk) {
              fullText += chunk;
              onChunk?.(chunk, fullText);
            }
          } catch {
            // Ignore malformed SSE events
          }
        }
      }

      onComplete?.(fullText);
    } catch (err) {
      if (err.name === 'AbortError') return;
      const msg = err.message || 'Unknown error';
      console.error('OpenAI stream error:', msg);
      setError(msg);
      onError?.(msg);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // Non-streaming call — used for character creation init and portrait generation.
  // systemPrompt: undefined → use MASTER_PROMPT (default for game calls)
  //               null      → no system message (e.g. self-contained prompts)
  //               string    → use that string as the system message
  const send = useCallback(async ({ apiKey, messages, maxTokens, systemPrompt }) => {
    if (!apiKey) throw new Error('No API key configured.');

    let openAIMessages;
    if (systemPrompt === null) {
      // No system message — the prompt is fully contained in the user message
      openAIMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: flattenContent(m.content),
      }));
    } else {
      openAIMessages = [
        { role: 'system', content: systemPrompt !== undefined ? systemPrompt : MASTER_PROMPT },
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: flattenContent(m.content),
        })),
      ];
    }

    const response = await fetchWithRetry(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens || MAX_TOKENS,
        messages: openAIMessages,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }, []);

  // API key validation ping
  const validateKey = useCallback(async (apiKey) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 5,
          messages: [
            { role: 'system', content: 'You are a test.' },
            { role: 'user', content: 'ping' },
          ],
        }),
      });
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  const validateKeyStrict = useCallback(async (apiKey) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 5,
          messages: [
            { role: 'system', content: 'Respond only with: OK' },
            { role: 'user', content: 'ping' },
          ],
        }),
      });

      if (response.status === 401) return { valid: false, error: 'Invalid API key.' };
      if (response.status === 403) return { valid: false, error: 'Unauthorized. Check your API key permissions.' };
      if (response.status === 404) return { valid: false, error: `Model "${MODEL}" not available on this key.` };
      if (!response.ok && response.status !== 429 && response.status !== 503) {
        return { valid: false, error: `API returned status ${response.status}.` };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: 'Network error. Check your connection.' };
    }
  }, []);

  // DALL-E 3 image generation — returns a base64 data URL (data:image/png;base64,...)
  const generateImage = useCallback(async ({ apiKey, prompt }) => {
    if (!apiKey) throw new Error('No API key configured.');

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Image API error: ${response.status}`);
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned from DALL-E.');
    return `data:image/png;base64,${b64}`;
  }, []);

  return { stream, send, abort, isStreaming, error, validateKeyStrict, generateImage };
}
