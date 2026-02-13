/**
 * Generate unique filename
 */
export declare function generateUniqueFilename(originalName: string): string;
/**
 * Build storage key for original files in R2
 */
export declare function buildOriginalKey(type: 'portfolio' | 'events' | 'slideshow', eventId: string | null, filename: string): string;
/**
 * Save original file to R2 storage
 */
export declare function saveOriginal(buffer: Buffer, type: 'portfolio' | 'events' | 'slideshow', eventId: string | null, filename: string, contentType: string): Promise<{
    url: string;
    key: string;
}>;
//# sourceMappingURL=storage.d.ts.map