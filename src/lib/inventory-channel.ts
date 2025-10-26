// Simple wrapper around BroadcastChannel to publish/subscribe inventory updates across tabs/components
export type InventarioEvento =
  | { tipo: 'ENTRADA' | 'SALIDA'; productoId: string; delta: number }
  | { tipo: 'AJUSTE'; productoId: string; cantidadNueva: number };

let channel: BroadcastChannel | null = null;

function getChannel() {
  if (typeof window === 'undefined') return null;
  if (!channel) channel = new BroadcastChannel('inventario-channel');
  return channel;
}

export function emitirInventarioEvento(evt: InventarioEvento) {
  const ch = getChannel();
  try {
    ch?.postMessage(evt);
  } catch {
    // noop
  }
}

export function suscribirseInventarioEventos(cb: (evt: InventarioEvento) => void) {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (ev: MessageEvent) => {
    const data = ev.data as InventarioEvento | undefined;
    if (!data) return;
    cb(data);
  };
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}