FROM node:18-alpine

WORKDIR /app/shared

# Установка зависимостей для сборки
RUN apk add --no-cache python3 make g++

# Копирование package.json и package-lock.json
COPY package*.json ./

# Установка зависимостей
RUN npm ci

# Копирование исходного кода
COPY . .

# Сборка TypeScript
RUN npm run build

# Очистка dev-зависимостей
RUN npm prune --production

# Удаление исходников после сборки
RUN rm -rf src/
RUN rm -rf node_modules/@types

# Установка легковесного пользователя
USER node

CMD ["node", "dist/index.js"] 