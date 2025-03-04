import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export class R2Service {
    private static instance: R2Service | null = null;
    private client: S3Client;

    private constructor() {
        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.r2.accessKeyId,
                secretAccessKey: config.r2.accessKeySecret,
            },
        });
    }

    public static async getInstance(): Promise<R2Service> {
        if (!R2Service.instance) {
            R2Service.instance = new R2Service();
        }
        return R2Service.instance;
    }

    public async uploadServerIcon(file: Buffer, mimeType: string): Promise<string> {
        const fileExtension = this.getFileExtension(mimeType);
        const key = `server-icons/${uuidv4()}${fileExtension}`;

        await this.client.send(
            new PutObjectCommand({
                Bucket: config.r2.bucketName,
                Key: key,
                Body: file,
                ContentType: mimeType,
            })
        );

        return `${config.r2.publicUrl}/${key}`;
    }

    private getFileExtension(mimeType: string): string {
        const extensions: { [key: string]: string } = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp'
        };
        return extensions[mimeType] || '.jpg';
    }
} 