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

# Создаем пользователя node и настраиваем права
RUN mkdir -p /app && chown -R node:node /app
USER node

# Копируем package.json и package-lock.json
COPY --chown=node:node package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production

# Копируем собранные файлы из предыдущего этапа
COPY --chown=node:node --from=builder /app/dist ./dist

# Определяем порты
EXPOSE 3002

# Устанавливаем переменные окружения по умолчанию
ENV NODE_ENV=production \
    PORT=3000

# Проверка работоспособности
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Запускаем приложение
CMD ["node", "dist/index.js"] 