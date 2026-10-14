import { useEffect, useState } from "react";
import { ConnectError } from "@connectrpc/connect";

export type StreamState = "connecting" | "live" | "reconnecting";

/**
 * Subscribes to a gRPC server-streaming call and reconnects on failure.
 * `open` receives an AbortSignal and must return the async iterable of events.
 */
export function useServerStream<T>(
  open: (signal: AbortSignal) => AsyncIterable<T>,
  onEvent: (event: T) => void,
  deps: unknown[],
): StreamState {
  const [state, setState] = useState<StreamState>("connecting");

  useEffect(() => {
    const controller = new AbortController();
    let attempt = 0;
    (async () => {
      while (!controller.signal.aborted) {
        try {
          const stream = open(controller.signal);
          setState("live");
          for await (const event of stream) {
            attempt = 0;
            onEvent(event);
          }
        } catch (err) {
          if (controller.signal.aborted) return;
          console.warn("stream error", ConnectError.from(err).message);
        }
        attempt++;
        setState("reconnecting");
        await new Promise((r) => setTimeout(r, Math.min(1000 * attempt, 5000)));
      }
    })();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Map state keyed by id, updated by stream events. */
export function useEntityMap<T>() {
  return useState<Map<string, T>>(() => new Map());
}

export function errorMessage(err: unknown): string {
  return ConnectError.from(err).rawMessage;
}
