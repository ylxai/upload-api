export declare const config: {
    port: number;
    nodeEnv: string;
    r2: {
        endpoint: string;
        accessKey: string;
        secretKey: string;
        bucket: string;
        publicUrl: string;
    };
    upload: {
        maxFileSize: number;
        maxFiles: number;
        allowedMimeTypes: string[];
    };
    thumbnails: {
        small: {
            width: number;
            height: number;
        };
        medium: {
            width: number;
            height: number;
        };
        large: {
            width: number;
            height: number;
        };
    };
    apiKey: string;
    databaseUrl: string;
};
export declare function validateConfig(): void;
//# sourceMappingURL=index.d.ts.map