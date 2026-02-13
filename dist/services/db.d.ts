export declare function query<T>(text: string, params?: any[]): Promise<T[]>;
export declare function insertPortfolioPhoto(input: {
    id: string;
    filename: string;
    originalUrl: string;
    thumbnailUrl: string;
    thumbnailSmallUrl: string | null;
    thumbnailMediumUrl: string | null;
    thumbnailLargeUrl: string | null;
}): Promise<void>;
export declare function insertEventPhoto(input: {
    id: string;
    eventId: string;
    filename: string;
    originalUrl: string;
    thumbnailUrl: string | null;
    thumbnailSmallUrl: string | null;
    thumbnailMediumUrl: string | null;
    thumbnailLargeUrl: string | null;
    width: number;
    height: number;
    size: number;
    mimeType: string;
}): Promise<void>;
export declare function insertHeroSlide(input: {
    id: string;
    imageUrl: string;
    thumbnailUrl: string | null;
}): Promise<void>;
export declare function closeDb(): Promise<void>;
//# sourceMappingURL=db.d.ts.map