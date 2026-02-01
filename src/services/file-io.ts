import fs from 'fs/promises'

export async function readFileBuffer(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath)
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}
