/**
 * URLs for files in public/.
 *
 * Exists because string-concatenating `import.meta.env.BASE_URL` is a trap.
 * GitHub Pages serves from /<repo>/, and `actions/configure-pages` emits that
 * base without a trailing slash, so `${BASE_URL}crest.png` became
 * "/Griffin-Gradercrest.png" and the crest rendered as a broken-image icon on
 * the first real deploy. vite.config.ts now normalises the base, and routing
 * every asset through here means a future base can never reintroduce it.
 */
export function assetUrl(path: string, base: string = import.meta.env.BASE_URL): string {
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}
