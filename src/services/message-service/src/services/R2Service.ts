import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../../config';
import { v4 as uuidv4 } from 'uuid';

export class R2Service {
    private static instance: R2Service;
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

    public static getInstance(): R2Service {
        if (!R2Service.instance) {
            R2Service.instance = new R2Service();
        }
        return R2Service.instance;
    }

    public async uploadAttachment(file: Buffer, mimeType: string): Promise<string> {
        const fileExtension = this.getFileExtension(mimeType);
        const fileName = `attachments/${uuidv4()}${fileExtension}`;

        await this.client.send(
            new PutObjectCommand({
                Bucket: config.r2.bucketName,
                Key: fileName,
                Body: file,
                ContentType: mimeType,
                ACL: 'public-read',
            })
        );

        return `${config.r2.publicUrl}/${fileName}`;
    }

    private getFileExtension(mimeType: string): string {
        const extensions: { [key: string]: string } = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'text/plain': '.txt',
            'application/zip': '.zip',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'video/mp4': '.mp4',
            'video/webm': '.webm'
        };
        return extensions[mimeType] || '.bin';
    }
} 