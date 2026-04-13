// useClaudeAPI — streaming Claude API integration
// Makes direct fetch calls from the renderer (no CORS in Electron)
// Injects full master prompt as system message on every call

import { useState, useCallback, useRef } from 'react';
import MASTER_PROMPT from '../constants/masterPrompt';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1500;

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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: MASTER_PROMPT,
          messages,
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
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const chunk = event.delta.text;
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

  // Non-streaming call — used for API key validation and character creation init
  const send = useCallback(async ({ apiKey, messages, maxTokens }) => {
    if (!apiKey) throw new Error('No API key configured.');

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens || MAX_TOKENS,
        system: MASTER_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }, []);

  // API key validation ping
  const validateKey = useCallback(async (apiKey) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 5,
          system: 'You are a test.',
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      // If we get a 4xx other than auth error, key format might be ok
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
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 5,
          system: 'Respond only with: OK',
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      if (response.status === 401) return { valid: false, error: 'Invalid API key.' };
      if (response.status === 403) return { valid: false, error: 'Unauthorized. Check your API key permissions.' };
      if (!response.ok && response.status !== 529) {
        return { valid: false, error: `API returned status ${response.status}.` };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: 'Network error. Check your connection.' };
    }
  }, []);

  return { stream, send, abort, isStreaming, error, validateKeyStrict };
}
