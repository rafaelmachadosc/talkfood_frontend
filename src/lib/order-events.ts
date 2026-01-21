/**
 * Sistema de eventos para notificar componentes sobre mudanças em pedidos
 * Permite carregamento reativo apenas quando há ações reais (novo pedido, mesa aberta, etc)
 */

type OrderEventType = 
  | "order:created"
  | "order:updated"
  | "order:finished"
  | "order:received"
  | "order:viewed"
  | "order:deleted"
  | "table:opened"
  | "refresh:orders";

type OrderEventListener = () => void;

class OrderEventEmitter {
  private listeners: Map<OrderEventType, Set<OrderEventListener>> = new Map();

  /**
   * Registra um listener para um tipo de evento
   */
  on(event: OrderEventType, listener: OrderEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Retorna função para remover o listener
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Remove um listener de um tipo de evento
   */
  off(event: OrderEventType, listener: OrderEventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Dispara um evento, notificando todos os listeners
   */
  emit(event: OrderEventType): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          console.error(`Erro ao executar listener do evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove todos os listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// Singleton global
export const orderEvents = new OrderEventEmitter();

/**
 * Funções helper para disparar eventos comuns
 */
export const orderEventHelpers = {
  notifyOrderCreated: () => {
    orderEvents.emit("order:created");
    orderEvents.emit("refresh:orders");
  },
  notifyOrderUpdated: () => {
    orderEvents.emit("order:updated");
    orderEvents.emit("refresh:orders");
  },
  notifyOrderFinished: () => {
    orderEvents.emit("order:finished");
    orderEvents.emit("refresh:orders");
  },
  notifyOrderReceived: () => {
    orderEvents.emit("order:received");
    orderEvents.emit("refresh:orders");
  },
  notifyOrderViewed: () => {
    orderEvents.emit("order:viewed");
    orderEvents.emit("refresh:orders");
  },
  notifyOrderDeleted: () => {
    orderEvents.emit("order:deleted");
    orderEvents.emit("refresh:orders");
  },
  notifyTableOpened: () => {
    orderEvents.emit("table:opened");
    orderEvents.emit("refresh:orders");
  },
  notifyRefresh: () => {
    orderEvents.emit("refresh:orders");
  },
};
