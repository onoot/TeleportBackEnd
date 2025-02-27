#!/bin/bash

# Проверка переменной окружения PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "Ошибка: Переменная PROJECT_ID не установлена"
    echo "Используйте: export PROJECT_ID=your-project-id"
    exit 1
fi

# Настройка Docker для работы с GCR
gcloud auth configure-docker

# Список сервисов для сборки
SERVICES=(
    "user-service"
    "message-service"
    "call-service"
    "channel-service"
    "notification-service"
    "swagger-service"
)

# Сборка и отправка образов
for SERVICE in "${SERVICES[@]}"; do
    echo "Сборка $SERVICE..."
    cd "src/services/$SERVICE"
    
    if [ -f "Dockerfile" ]; then
        docker build -t "gcr.io/$PROJECT_ID/$SERVICE:latest" .
        
        echo "Отправка $SERVICE в GCR..."
        docker push "gcr.io/$PROJECT_ID/$SERVICE:latest"
    else
        echo "Ошибка: Dockerfile не найден для $SERVICE"
    fi
    
    cd ../../..
done

echo "Все образы собраны и отправлены в GCR!" 