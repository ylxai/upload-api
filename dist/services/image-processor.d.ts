interface ThumbnailResult {
    size: 'small' | 'medium' | 'large';
    format: 'jpeg' | 'webp';
    url: string;
    key: string;
    width: number;
    height: number;
}
interface ProcessResult {
    original: {
        width: number;
        height: number;
        format: string;
    };
    thumbnails: ThumbnailResult[];
}
/**
 * Extract image metadata
 */
export declare function extractMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
}>;
/**
 * Validate image buffer (magic bytes)
 */
export declare function validateImage(buffer: Buffer, _mimeType: string): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Process image and generate all thumbnails
 */
export declare function processImage(buffer: Buffer, filename: string, type: 'portfolio' | 'events' | 'slideshow', eventId?: string | null): Promise<ProcessResult>;
/**
 * Get best thumbnail URL for each size (prefer WebP)
 */
export declare function getThumbnailUrls(thumbnails: ThumbnailResult[]): {
    small: string | null;
    medium: string | null;
    large: string | null;
};
export {};
//# sourceMappingURL=image-processor.d.ts.map