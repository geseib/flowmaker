// Shared by the crawl and the walkthrough. It lives in one module because the
// build concatenates every module into a single scope, where two top-level
// declarations of the same name collide.
export const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : 0);
