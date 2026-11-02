// Opt-in runtime scene inspector. No inspector code is loaded by ordinary players.
// In local Vite dev mode, press F2. On Vercel use /?editor=1, then F2 to toggle.
export function enableSceneInspector({ scene, camera, renderer }) {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('editor') === '1';
  if (!import.meta.env.DEV && !requested) return;

  let mounted = false;
  let pending = false;

  async function mount() {
    if (mounted || pending) return;
    pending = true;
    try {
      // A separate Vite chunk: neither UI nor Svelte is loaded during normal play.
      const { createInspector } = await import('three-inspect/vanilla');
      createInspector(document.body, { scene, camera, renderer });
      mounted = true;
      document.documentElement.dataset.knottyInspector = 'ready';
    } catch (error) {
      document.documentElement.dataset.knottyInspector = 'error';
      console.error('[KNOTTY PINE] Could not start Three Inspect:', error);
    } finally {
      pending = false;
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'F2' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (!mounted) {
      void mount();
    } else {
      // Three Inspect has a built-in "i" keyup visibility toggle.
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'i', bubbles: true }));
    }
  });

  if (requested) void mount();
}
