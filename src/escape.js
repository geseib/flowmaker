// Shared by the renderer, the markdown converter, and the export serializer.
// It lives in one module because the build concatenates every module into a
// single scope, where two top-level `esc` declarations would collide.
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
