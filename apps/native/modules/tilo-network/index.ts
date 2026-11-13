import TiloNetwork from './src/TiloNetworkModule'

/** Whether the device is on a network; true when unknown, as a browser assumes. */
export function isOnline(): boolean {
  return TiloNetwork ? TiloNetwork.isOnline() : true
}

/** Calls `fn` each time the device goes on or off a network. Returns an unsubscribe. */
export function onNetworkChange(fn: (online: boolean) => void): () => void {
  if (!TiloNetwork) return () => {}
  const sub = TiloNetwork.addListener('onChange', (e) => fn(e.online))
  return () => sub.remove()
}
