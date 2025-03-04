declare namespace Express {
    export interface Multer {
        /** Object containing file metadata and access information. */
        file: {
            /** Name of the form field associated with this file. */
            fieldname: string;
            /** Name of the file on the uploader's computer. */
            originalname: string;
            /** Value of the `Content-Type` header for this file. */
            mimetype: string;
            /** Size of the file in bytes. */
            size: number;
            /** `Buffer` containing the entire file. */
            buffer: Buffer;
        }
    }

    interface Request {
        user?: {
            id: string;
            username: string;
            roles: string[];
        };
        file?: {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            buffer: Buffer;
        };
    }
} 