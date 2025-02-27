# Этап сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Устанавливаем необходимые системные зависимости
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Копируем только файлы, необходимые для установки зависимостей
COPY package*.json ./
COPY tsconfig.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY src ./src

# Собираем TypeScript
RUN npm run build

# Этап production
FROM node:18-alpine

WORKDIR /app

# Создаем пользователя node и настраиваем права
RUN mkdir -p /app && chown -R node:node /app
USER node

# Копируем только production зависимости
COPY --chown=node:node package*.json ./
RUN npm install --only=production

# Копируем собранные файлы из предыдущего этапа
COPY --chown=node:node --from=builder /app/dist ./dist

# Определяем порт
EXPOSE 8080

# Устанавливаем переменные окружения
ENV NODE_ENV=production \
    PORT=8080

# Проверка работоспособности
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -qO- http://localhost:8080/health || exit 1

# Запускаем приложение
CMD ["node", "dist/index.js"] 