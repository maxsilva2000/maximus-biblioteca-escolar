/* Máximus Biblioteca Escolar — service worker.
   Busca sempre a versão mais nova na internet e usa o cache só como reserva,
   para o aplicativo abrir mesmo com a rede ruim e para as atualizações chegarem
   sem precisar limpar nada no celular. */

const CACHE = "maximus-biblioteca-v3";
const ARQUIVOS = ["./", "./index.html", "./config.js", "./manifest.webmanifest",
  "./marca.png", "./icone-192.png", "./icone-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  /* Firebase, bases de livros e IA nunca passam pelo cache. */
  if (/gstatic\.com|googleapis\.com|firebaseio|firestore|brasilapi\.com\.br|mercadoeditorial\.org|openlibrary\.org|api\.anthropic\.com/.test(url.host)) return;

  /* Biblioteca de planilhas: cache depois do primeiro uso. */
  if (/cdn\.jsdelivr\.net/.test(url.host)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
      return res;
    }).catch(() => new Response("", {status: 504}))));
    return;
  }

  /* Arquivos do aplicativo: primeiro a rede, cache como reserva. */
  e.respondWith(
    fetch(e.request).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./index.html")))
  );
});
