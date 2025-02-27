# Мессенджер на Микросервисной Архитектуре

Современный мессенджер, построенный на микросервисной архитектуре с использованием Node.js, TypeScript, MongoDB, PostgreSQL и других современных технологий.

## Основные Функции

- Обмен сообщениями в реальном времени
- Голосовые и видео звонки через WebRTC
- Обмен фото и голосовыми сообщениями
- Создание групп и каналов
- Система ролей и прав доступа
- Реакции на сообщения
- Система друзей и черный список
- Настройки профиля и каналов

## Технологический Стек

- **Backend**: Node.js, TypeScript
- **Базы Данных**: 
  - MongoDB (для сообщений, медиа)
  - PostgreSQL (для пользователей, отношений)
- **Кэширование**: Redis
- **Очереди Сообщений**: Apache Kafka
- **Хранение Файлов**: Cloudflare R2
- **Контейнеризация**: Docker
- **Оркестрация**: Kubernetes

## Микросервисы

1. Сервис Сообщений
2. Сервис Пользователей
3. Сервис Медиа
4. Сервис Групп и Каналов
5. Сервис Настроек
6. Сервис Уведомлений
7. Сервис Видео/Аудио

## Установка и Запуск

### Предварительные Требования

- Docker и Docker Compose
- Node.js 18+
- Kubernetes кластер (для production)

### Локальная Разработка

1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/onoot/messenger.git
   cd messenger
   ```

2. Создайте файл .env на основе .env.example:
   ```bash
   cp .env.example .env
   ```

3. Запустите сервисы через Docker Compose:
   ```bash
   docker-compose up -d
   ```

### Production Deployment

1. Соберите Docker образы:
   ```bash
   docker build -t message-service:latest ./src/services/message-service
   docker build -t user-service:latest ./src/services/user-service
   docker build -t media-service:latest ./src/services/media-service
   ```

2. Примените Kubernetes манифесты:
   ```bash
   kubectl apply -f kubernetes/
   ```

## Структура Проекта

```
├── src/
│   ├── services/
│   │   ├── message-service/
│   │   ├── user-service/
│   │   ├── media-service/
│   │   └── ...
│   └── shared/
├── kubernetes/
├── docker-compose.yml
└── README.md
```

## Мониторинг и Логирование

- Prometheus для метрик
- Grafana для визуализации
- ELK Stack для логов

## API Документация

API документация доступна через Swagger UI после запуска сервисов:
- Message Service: http://localhost:3001/api-docs
- User Service: http://localhost:3002/api-docs
- Media Service: http://localhost:3003/api-docs

## Разработка

### Добавление Нового Микросервиса

1. Создайте новую директорию в `src/services/`
2. Скопируйте базовую структуру из существующего сервиса
3. Обновите конфигурацию в docker-compose.yml
4. Создайте Kubernetes манифесты

### Тестирование

```bash
# Запуск тестов для всех сервисов
npm test

# Запуск тестов для конкретного сервиса
cd src/services/message-service && npm test
```

## Безопасность

- JWT для аутентификации
- Rate limiting
- Input validation
- CORS protection
- Secure WebSocket connections

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Лицензия

MIT 

# Messenger Application CI/CD

## Настройка CI/CD

### Предварительные требования

1. GitHub репозиторий с кодом
2. Доступ к GitHub Container Registry (ghcr.io)
3. Kubernetes кластер
4. Настроенные секреты в GitHub Actions

### Настройка GitHub Secrets

В настройках репозитория необходимо добавить следующие секреты:

1. `KUBE_CONFIG` - содержимое файла kubeconfig для доступа к кластеру
2. `MESSENGER_SECRETS` - base64-encoded содержимое файла с секретами (см. пример в kubernetes/secrets/messenger-secrets.yaml.example)

### Структура проекта

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow
├── kubernetes/
│   ├── base/              # Базовые манифесты Kubernetes
│   ├── overlays/          # Окружение-специфичные настройки
│   │   └── prod/         
│   └── secrets/           # Секреты (не хранятся в Git)
├── src/
│   └── services/          # Микросервисы
└── README.md
```

### Процесс деплоя

1. При пуше в ветку `main`:
   - Собираются Docker образы сервисов
   - Образы публикуются в GitHub Container Registry
   - Применяются секреты в кластер
   - Обновляются деплойменты с новыми версиями образов

### Локальная разработка

1. Скопируйте `kubernetes/secrets/messenger-secrets.yaml.example` в `kubernetes/secrets/messenger-secrets.yaml`
2. Заполните реальные значения секретов
3. Примените конфигурацию:
   ```bash
   kubectl apply -f kubernetes/secrets/messenger-secrets.yaml
   kubectl apply -f kubernetes/base/
   kubectl apply -f kubernetes/overlays/prod/
   ```

### Добавление новых секретов

1. Добавьте новый секрет в `kubernetes/secrets/messenger-secrets.yaml.example`
2. Обновите реальный файл секретов
3. Закодируйте файл в base64:
   ```bash
   cat kubernetes/secrets/messenger-secrets.yaml | base64
   ```
4. Обновите секрет `MESSENGER_SECRETS` в настройках GitHub репозитория

### Мониторинг деплоя

1. Проверьте статус GitHub Actions в разделе "Actions" репозитория
2. Проверьте статус подов:
   ```bash
   kubectl get pods -n messenger
   ```
3. Проверьте логи:
   ```bash
   kubectl logs -n messenger deployment/user-service
   kubectl logs -n messenger deployment/notification-service
   ``` 

## Работа с Секретами

Проект использует `git-crypt` для безопасного хранения секретов в репозитории.

### Первоначальная настройка (для новых разработчиков)

1. Установите git-crypt:
   ```bash
   # Windows
   # Скачайте и установите с https://github.com/AGWA/git-crypt/releases

   # macOS
   brew install git-crypt

   # Linux
   sudo apt-get install git-crypt
   ```

2. Получите файл `secret.key` от администратора проекта

3. Разблокируйте секреты:
   ```bash
   git-crypt unlock path/to/secret.key
   ```

4. Запустите скрипт настройки:
   ```bash
   ./scripts/setup-secrets.sh
   ```

### Что зашифровано?

- `kubernetes/secrets/*.yaml` - секреты Kubernetes
- `kubernetes/cluster-config/*` - конфигурации кластера
- `.env` файлы (кроме `.env.example`)
- Все файлы, содержащие `secret` или `secrets` в имени

### Добавление новых секретов

1. Создайте файл с секретами в соответствующей директории
2. Убедитесь, что файл соответствует паттерну в `.gitattributes`
3. Закоммитьте изменения - файл будет автоматически зашифрован

### Проверка статуса файлов

```bash
# Показать статус шифрования файлов
git-crypt status

# Проверить конкретный файл
git-crypt status kubernetes/secrets/app-secrets.yaml
``` 