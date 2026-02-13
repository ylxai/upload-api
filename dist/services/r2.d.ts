/**
 * Upload file to R2
 */
export declare function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<{
    url: string;
    key: string;
}>;
/**
 * Delete file from R2
 */
export declare function deleteFromR2(key: string): Promise<void>;
/**
 * Build storage key for thumbnails
 */
export declare function buildThumbnailKey(type: 'portfolio' | 'events' | 'slideshow', eventId: string | null, filename: string, size: 'small' | 'medium' | 'large', format: 'jpeg' | 'webp'): string;
//# sourceMappingURL=r2.d.ts.map