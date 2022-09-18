const staticCacheName = "change-app-static-v2"
const dynamicCacheName = "change-app-dynamic-v2" 
const assets = [
  "static/css/style.css",
  "static/css/materialize.css",
  "static/js/app.js",
  "static/js/materialize.js",
  "static/js/orm.js",
  "static/js/gui.js",
  "static/js/gdrive.js",
  "static/js/spendings.js",
  "static/js/planning.js",
  "static/js/planning.json",
  "static/manifest.json",
  "static/icons/cash-multiple.svg",
  "static/icons/content-save.svg",
  "static/icons/delete.svg",
  "static/icons/menu.svg",
  "static/icons/pencil.svg",
  "static/icons/icon-144x144.png",
  "static/icons/table-row-plus-after.svg",
  "static/icons/table-column-plus-before.svg",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://fonts.gstatic.com/s/materialicons/v139/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2"
]

//Comment     
self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
      caches.open(staticCacheName).then(cache => {
      cache.addAll(assets)
    })
  )
})

self.addEventListener("activate", activateEvent => {
    activateEvent.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== staticCacheName)
                .map(key => caches.delete(key))
                )
		})
    )
})

self.addEventListener("fetch", fetchEvent => {
  fetchEvent.respondWith(
    caches.match(fetchEvent.request).then(res => {
        return res || fetch(fetchEvent.request).then(fetchRes => {
            return caches.open(dynamicCacheName).then(cache => {
                cache.put(fetchEvent.request.url, fetchRes.clone());
                return fetchRes;
			})
		})
    })
  )
})