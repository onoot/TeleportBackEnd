# Этап сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Копируем файлы package.json и tsconfig.json
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем все зависимости
RUN npm install

# Копируем исходный код
COPY src ./src

# Собираем TypeScript
RUN npm run build

# Этап production
FROM node:18-alpine

WORKDIR /app

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Создаем директорию для секретов
RUN mkdir -p /etc/secrets/postgres \
    /etc/secrets/jwt \
    /etc/secrets/redis \
    /etc/secrets/kafka \
    /etc/secrets/mongodb \
    && chown -R node:node /etc/secrets

# Создаем пользователя node и настраиваем права
RUN mkdir -p /app && chown -R node:node /app
USER node

# Копируем package.json и package-lock.json
COPY --chown=node:node package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем собранные файлы из предыдущего этапа
COPY --chown=node:node --from=builder /app/dist ./dist

# Создаем скрипт для проверки и выполнения миграций
COPY --chown=node:node scripts/wait-for-migrations.sh ./scripts/
RUN chmod +x ./scripts/wait-for-migrations.sh

# Определяем порты
EXPOSE 3003 8083

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production \
    PORT=3003 \
    WS_PORT=8083 \
    MONGODB_URI=mongodb://localhost:27017/calls

# Проверка работоспособности
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:3003/health || exit 1

# Запускаем приложение
CMD ["./scripts/wait-for-migrations.sh"] 