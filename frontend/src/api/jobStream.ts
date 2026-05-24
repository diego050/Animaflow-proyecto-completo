import { API_BASE } from './client';

export interface JobStreamEvent {
  status: string;
  video_url?: string;
  error_message?: string;
  error?: string;
}

export interface StreamCallbacks {
  onStatusChange: (data: JobStreamEvent) => void;
  onComplete: (data: JobStreamEvent) => void;
  onError: (error: string) => void;
}

export function subscribeToJob(jobId: string, callbacks: StreamCallbacks) {
  const token = localStorage.getItem('animaflow_token');
  const url = `${API_BASE}/api/jobs/${jobId}/stream?token=${token}`;

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  const maxRetries = 5;
  let isClosed = false;
  let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (isClosed) return;

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      retryCount = 0;
    };

    eventSource.addEventListener('progress', (e) => {
      try {
        const data: JobStreamEvent = JSON.parse(e.data);
        callbacks.onStatusChange(data);

        if (data.status === 'completed' || data.status === 'failed') {
          callbacks.onComplete(data);
          close();
        }
      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    });

    eventSource.addEventListener('error', (e: Event) => {
      const messageEvent = e as MessageEvent;
      
      if (messageEvent.data) {
        try {
          const data = JSON.parse(messageEvent.data);
          if (data.error) {
            errorMessage = data.error;
            callbacks.onError(errorMessage);
            close();
            return;
          }
        } catch {
          // Ignore
        }
      }

      if (eventSource) {
        eventSource.close();
      }

      if (!isClosed) {
        if (retryCount < maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryCount++;
          retryTimeoutId = setTimeout(connect, backoff);
        } else {
          callbacks.onError('Max retries reached. Connection failed.');
          close();
        }
      }
    });
  };

  const close = () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (retryTimeoutId) {
      clearTimeout(retryTimeoutId);
      retryTimeoutId = null;
    }
  };

  connect();

  return close;
}
