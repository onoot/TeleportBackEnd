#!/bin/bash

# Проверка переменной окружения PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    echo "Ошибка: Переменная PROJECT_ID не установлена"
    echo "Используйте: export PROJECT_ID=your-project-id"
    exit 1
fi

# Создание namespace если не существует
echo "Создание namespace..."
kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -

# Применение ConfigMaps и Secrets
echo "Применение ConfigMaps и Secrets..."
kubectl apply -f kubernetes/config/
kubectl apply -f kubernetes/secrets/

# Установка Traefik
echo "Установка Traefik..."
kubectl apply -f kubernetes/traefik-crds.yaml
kubectl apply -f kubernetes/traefik-deployment.yaml
kubectl apply -f kubernetes/traefik-service.yaml
kubectl apply -f kubernetes/middleware.yaml

# Ожидание готовности Traefik
echo "Ожидание готовности Traefik..."
kubectl wait --for=condition=ready pod -l app=traefik -n messenger --timeout=300s

# Установка Swagger
echo "Установка Swagger..."
kubectl apply -f kubernetes/swagger-service.yaml

# Проверка статуса
echo "Проверка статуса развертывания..."
kubectl get pods -n messenger
kubectl get svc -n messenger

# Проверка проблемных подов
echo "Проверка проблемных подов..."
PROBLEMATIC_PODS=$(kubectl get pods -n messenger | grep -E 'Error|CrashLoopBackOff|Pending' | awk '{print $1}')
if [ ! -z "$PROBLEMATIC_PODS" ]; then
    echo "Найдены проблемные поды, проверка логов..."
    for POD in $PROBLEMATIC_PODS; do
        echo "Логи для $POD:"
        kubectl logs $POD -n messenger
        echo "Описание пода:"
        kubectl describe pod $POD -n messenger
    done
fi

echo "Выборочное развертывание завершено!" 