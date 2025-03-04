import { Request, Response } from 'express';
import { JsonController, Post, Get, Put, Body, Param, UseBefore, Req, Res, HttpCode, UploadedFile, Authorized } from 'routing-controllers';
import { authMiddleware } from '../../middleware/auth';
import { AppDataSource } from '../../data-source';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { KafkaService } from '../../services/KafkaService';
import { NotificationType } from '../../types/events';
import { R2Service } from '../../services/R2Service';
import multer from 'multer';
import { User, UserStatus, UserSettings } from '../../types/user';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity implements User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    username!: string;

    @Column()
    email!: string;

    @Column()
    password!: string;

    @Column({ nullable: true })
    avatar: string | null = null;

    @Column({ type: 'enum', enum: ['online', 'offline'], default: 'offline' })
    status: UserStatus = 'offline';

    @Column('jsonb', { default: {} })
    settings: UserSettings = {};

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    last_seen: Date = new Date();

    @Column({ default: false })
    email_verified: boolean = false;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date = new Date();

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updated_at: Date = new Date();
}

interface JwtPayload {
    id: number;
    username: string;
}

interface UpdateUserDto {
    username?: string;
    email?: string;
    settings?: UserSettings;
    avatar?: string | null;
    status?: UserStatus;
}

@JsonController('/users')
@UseBefore(authMiddleware)
export class UserController {
    private readonly userRepository = AppDataSource.getRepository(UserEntity);
    private readonly kafkaService: KafkaService;
    private readonly r2Service: R2Service;

    constructor() {
        this.kafkaService = new KafkaService();
        this.r2Service = R2Service.getInstance();
    }

    @Get('/me')
    async getCurrentUser(@Req() req: Request, @Res() response: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const user = await this.userRepository.findOne({ 
                where: { id: decoded.id },
                select: ['id', 'username', 'email', 'avatar', 'status', 'settings', 'last_seen'] 
            });

            if (!user) {
                return response.status(404).json({
                    status: 404,
                    message: "Пользователь не найден"
                });
            }

            return response.json({
                status: 200,
                data: user
            });
        } catch (error) {
            console.error('Error getting current user:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при получении данных пользователя"
            });
        }
    }

    @Put('/me')
    async updateUser(@Req() req: Request, @Body() data: UpdateUserDto, @Res() response: Response) {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) {
                return response.status(401).json({
                    status: 401,
                    message: "Отсутствует токен авторизации"
                });
            }

            const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
            const user = await this.userRepository.findOne({ where: { id: decoded.id } });

            if (!user) {
                return response.status(404).json({
                    status: 404,
                    message: "Пользователь не найден"
                });
            }

            if (data.username) user.username = data.username;
            if (data.email) user.email = data.email;
            if (data.settings) user.settings = { ...user.settings, ...data.settings };
            if (data.status && (data.status === 'online' || data.status === 'offline')) {
                user.status = data.status;
            }

            await this.userRepository.save(user);

            if (data.settings) {
                await this.kafkaService.emit('users', {
                    type: NotificationType.USER_SETTINGS_UPDATE,
                    userId: user.id,
                    data: {
                        settings: user.settings
                    }
                });
            }

            return response.json({
                status: 200,
                data: user
            });
        } catch (error) {
            console.error('Error updating user:', error);
            return response.status(500).json({
                status: 500,
                message: "Ошибка при обновлении данных пользователя"
            });
        }
    }

    @Post('/avatar')
    @HttpCode(200)
    async uploadAvatar(
        @Req() request: Request,
        @UploadedFile('avatar', { options: { limits: { fileSize: 5 * 1024 * 1024 } } }) 
        file: { buffer: Buffer; mimetype: string; size: number }
    ): Promise<{ avatarUrl: string }> {
        const token = request.headers.authorization?.split(' ')[1];
        if (!token) {
            throw new Error('Unauthorized');
        }

        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        const user = await this.userRepository.findOne({ where: { id: decoded.id } });

        if (!user) {
            throw new Error('User not found');
        }
        
        if (!file.mimetype.startsWith('image/')) {
            throw new Error('Invalid file type');
        }

        const avatarUrl = await this.r2Service.uploadAvatar(file.buffer, file.mimetype);
        await this.userRepository.update(user.id, { avatar: avatarUrl });

        return { avatarUrl };
    }
}