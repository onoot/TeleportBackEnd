# Этап сборки
FROM node:18-alpine as builder

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
COPY config ./config

# Собираем TypeScript
RUN npm run build

# Начинаем новый этап сборки
FROM node:18-alpine

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Создаем пользователя node и настраиваем права
RUN mkdir -p /app && chown -R node:node /app
WORKDIR /app
USER node

# Копируем package.json
COPY --chown=node:node package*.json ./

# Устанавливаем только production зависимости
RUN npm install --omit=dev

# Копируем собранные файлы из предыдущего этапа
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/config ./config

# Создаем скрипт для проверки и выполнения миграций
COPY --chown=node:node scripts/wait-for-database.sh ./scripts/
RUN chmod +x ./scripts/wait-for-database.sh

# Определяем порт, который будет прослушивать приложение
EXPOSE 3000

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production \
    PORT=3000

# Проверка работоспособности
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Запускаем приложение
CMD ["./scripts/wait-for-database.sh"] 