/* Service worker da Biblioteca: guarda o aplicativo para funcionar sem internet. */
const CACHE = "biblioteca-v1";
const ARQUIVOS = ["./", "./index.html", "./manifest.webmanifest", "./icone-192.png", "./icone-512.png", "./marca.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  /* Buscas bibliográficas e IA sempre vão para a rede. */
  if (/googleapis\.com|openlibrary\.org|api\.anthropic\.com/.test(url.host)) return;

  /* A biblioteca de planilhas fica em cache depois do primeiro uso. */
  if (/cdn\.jsdelivr\.net/.test(url.host)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return res;
      }).catch(() => new Response("", { status: 504 })))
    );
    return;
  }

  /* Arquivos do próprio aplicativo: usa o cache e atualiza em segundo plano. */
  e.respondWith(
    caches.match(e.request).then(r => {
      const rede = fetch(e.request).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return res;
      }).catch(() => r);
      return r || rede;
    })
  );
});
