// The component gallery as a route, so scripts/e2e-gallery-parity.cjs can open it at /gallery on the
// web render; on a phone it opens from the Spike sheet instead (lib/labSheet.tsx).
import { Gallery } from '../lib/Gallery'
export default function GalleryRoute() { return <Gallery standalone /> }
