// Local image vault (IndexedDB). Photos attached to a case — model plates,
// symptoms, wiring — live here on the device. localStorage is too small for
// image blobs, so only their ids live in the case record; the bytes live here.

const DB_NAME = 'aurora_vault'
const STORE = 'images'
let _db: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (_db) return _db
  _db = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
  return _db
}

async function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const d = await db()
  return d.transaction(STORE, mode).objectStore(STORE)
}

export function newImageId(): string {
  return 'img_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  const s = await tx('readwrite')
  return new Promise((res, rej) => {
    const r = s.put(blob, id)
    r.onsuccess = () => res()
    r.onerror = () => rej(r.error)
  })
}

export async function getImage(id: string): Promise<Blob | null> {
  const s = await tx('readonly')
  return new Promise((res) => {
    const r = s.get(id)
    r.onsuccess = () => res((r.result as Blob) ?? null)
    r.onerror = () => res(null)
  })
}

const urls = new Map<string, string>()
export function cacheUrlFor(id: string, blob: Blob): string {
  const u = URL.createObjectURL(blob)
  urls.set(id, u)
  return u
}
export function urlFor(id: string): string | null {
  return urls.get(id) ?? null
}
export async function ensureUrl(id: string): Promise<string | null> {
  if (urls.has(id)) return urls.get(id)!
  const blob = await getImage(id)
  if (!blob) return null
  const u = URL.createObjectURL(blob)
  urls.set(id, u)
  return u
}

export async function deleteImages(ids: string[]): Promise<void> {
  const s = await tx('readwrite')
  for (const id of ids) {
    s.delete(id)
    const u = urls.get(id)
    if (u) { URL.revokeObjectURL(u); urls.delete(id) }
  }
}

// Read a Blob as a data URL for sending to the brain.
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(fr.result as string)
    fr.onerror = () => rej(fr.error)
    fr.readAsDataURL(blob)
  })
}

// Downscale to Claude's optimal max edge and re-encode JPEG (small, cheap).
export function downscaleToDataUrl(blob: Blob, maxEdge = 1568): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const scale = Math.min(1, maxEdge / Math.max(width, height))
      width = Math.max(1, Math.round(width * scale))
      height = Math.max(1, Math.round(height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("couldn't read image")) }
    img.src = url
  })
}
