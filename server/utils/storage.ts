/**
 * Storage abstraction — Vercel Blob (production) ou filesystem local (dev).
 *
 * En production (BLOB_READ_WRITE_TOKEN présent) : utilise @vercel/blob.
 * En dev : utilise le filesystem local dans public/generated/.
 */

import { put as blobPut, list as blobList, del as blobDel, get as blobGet } from '@vercel/blob'
import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises'
import { join } from 'path'

const BLOB_PREFIX = 'presentations/'

function isVercel(): boolean {
  return !!process.env.VERCEL
}

function useBlob(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

function ensureStorage(): void {
  if (isVercel() && !useBlob()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN manquant. Ajoutez un Blob Store dans votre projet Vercel : ' +
      'Dashboard → Storage → Create → Blob → Connecter au projet.'
    )
  }
}

function localDir(): string {
  return join(process.cwd(), 'public', 'generated')
}

// ─── WRITE ──────────────────────────────────────────────

export async function storageWrite(filename: string, content: string, contentType = 'text/html'): Promise<string> {
  ensureStorage()
  if (useBlob()) {
    const result = await blobPut(`${BLOB_PREFIX}${filename}`, content, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType
    })
    return result.url
  }

  // Local filesystem
  const dir = localDir()
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), content, 'utf-8')
  return `/generated/${filename}`
}

// ─── READ ───────────────────────────────────────────────

export async function storageRead(filename: string): Promise<string | null> {
  ensureStorage()
  if (useBlob()) {
    try {
      const result = await blobGet(`${BLOB_PREFIX}${filename}`, { access: 'public' })
      if (!result || result.statusCode === 304) return null
      const reader = result.stream.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      return new TextDecoder().decode(Buffer.concat(chunks))
    } catch {
      return null
    }
  }

  // Local filesystem
  try {
    return await readFile(join(localDir(), filename), 'utf-8')
  } catch {
    return null
  }
}

// ─── DELETE ─────────────────────────────────────────────

export async function storageDelete(filename: string): Promise<void> {
  if (useBlob()) {
    await blobDel(`${BLOB_PREFIX}${filename}`)
    return
  }

  // Local filesystem
  const { unlink } = await import('fs/promises')
  try {
    await unlink(join(localDir(), filename))
  } catch {
    // Ignore if not found
  }
}

// ─── LIST ───────────────────────────────────────────────

export interface StorageFile {
  filename: string
  url: string
  size: number
  uploadedAt: Date
}

export async function storageList(): Promise<StorageFile[]> {
  ensureStorage()
  if (useBlob()) {
    const files: StorageFile[] = []
    let cursor: string | undefined

    // Pagination — max 1000 par appel
    do {
      const result = await blobList({
        prefix: BLOB_PREFIX,
        cursor
      })

      for (const blob of result.blobs) {
        const filename = blob.pathname.replace(BLOB_PREFIX, '')
        if (filename.endsWith('.html')) {
          files.push({
            filename,
            url: blob.url,
            size: blob.size,
            uploadedAt: blob.uploadedAt
          })
        }
      }

      cursor = result.hasMore ? result.cursor : undefined
    } while (cursor)

    return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
  }

  // Local filesystem
  const dir = localDir()
  try {
    await mkdir(dir, { recursive: true })
    const entries = await readdir(dir)
    const htmlFiles = entries.filter(f => f.endsWith('.html'))

    const files: StorageFile[] = []
    for (const filename of htmlFiles) {
      const fileStat = await stat(join(dir, filename))
      files.push({
        filename,
        url: `/generated/${filename}`,
        size: fileStat.size,
        uploadedAt: fileStat.mtime
      })
    }

    return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
  } catch {
    return []
  }
}

// ─── HELPERS METADATA ───────────────────────────────────

export async function storageWritePresentation(
  filename: string,
  html: string,
  metadata: Record<string, any>
): Promise<{ htmlUrl: string; metadataUrl: string }> {
  const metadataFilename = filename.replace('.html', '.json')

  const [htmlUrl, metadataUrl] = await Promise.all([
    storageWrite(filename, html, 'text/html'),
    storageWrite(metadataFilename, JSON.stringify(metadata, null, 2), 'application/json')
  ])

  return { htmlUrl, metadataUrl }
}

export async function storageReadMetadata(filename: string): Promise<Record<string, any> | null> {
  const metadataFilename = filename.replace('.html', '.json')
  const content = await storageRead(metadataFilename)
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}
