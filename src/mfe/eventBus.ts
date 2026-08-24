import { MFEEventMap, MFEEventType } from './types';

type EventHandler<T> = (payload: T) => void;

/**
 * Cross-MFE Event Bus
 * Enables decoupled pub/sub communication across the App Shell and Remote Domain MFEs.
 */
class CrossMFEEventBus {
  private listeners: Map<string, Set<EventHandler<any>>> = new Map();

  /**
   * Subscribe to a specific MFE event
   */
  public on<K extends MFEEventType>(event: K, handler: EventHandler<MFEEventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler);

    // Return unbind function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Publish an event to all active MFE domain listeners
   */
  public emit<K extends MFEEventType>(event: K, payload: MFEEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[MFE Event Bus] Error in handler for event "${event}":`, err);
        }
      });
    }

    // Also dispatch to window for external module federation consumers
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`mfe:${event}`, {
          detail: payload,
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Clear all subscribers (useful for testing or full teardown)
   */
  public clear(): void {
    this.listeners.clear();
  }
}

export const mfeEventBus = new CrossMFEEventBus();
