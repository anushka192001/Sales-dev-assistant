import { StreamCallbacks } from "../types/api";


export class ApiService {
  private static readonly BASE_URL = 'http://localhost:8000';

  // The existing non-streaming method (kept for backward compatibility)
  static async sendMessage(request: { message: string; session_id: string }) {
    const response = await fetch(`${this.BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    console.log("Response", response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // NEW: Stream message with native SSE support
  static streamMessage(
    request: { message: string; session_id: string },
    callbacks: StreamCallbacks
  ): AbortController {
    const abortController = new AbortController();

    // Start the async streaming process
    (async () => {
      try {
        const response = await fetch(`${this.BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify(request),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            callbacks.onComplete?.();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('event: ')) {
              const event = line.slice(7).trim();
              const dataLine = lines[i + 1];

              if (dataLine?.startsWith('data: ')) {
                try {
                  const data = JSON.parse(dataLine.slice(6));

                  switch (event) {
                    case 'connected':
                      callbacks.onConnected?.(data);
                      break;
                    case 'progress':
                      callbacks.onProgress?.(data);
                      break;
                    case 'result':
                      callbacks.onResult?.(data);
                      break;
                    case 'done':
                      callbacks.onComplete?.();
                      break;
                    case 'error':
                      callbacks.onError?.(data);
                      break;
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }

                i++; // Skip the data line we just processed
              }
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          callbacks.onError?.({ error: error.message });
        }
      }
    })();

    return abortController;
  }

  // Existing methods remain unchanged
  static async getConversation(sessionId: string) {
    const response = await fetch(`${this.BASE_URL}/conversations/${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { messages: [], message_count: 0 };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async getSessions() {
    const response = await fetch(`${this.BASE_URL}/sessions`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async getSessionSummary(sessionId: string) {
    const response = await fetch(`${this.BASE_URL}/sessions/${sessionId}/summary`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  static async clearSession(sessionId: string) {
    const response = await fetch(`${this.BASE_URL}/session/${sessionId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}