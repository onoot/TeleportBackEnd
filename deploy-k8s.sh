#!/bin/bash

# Создание namespace если не существует
echo "Создание namespace..."
kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -

# Применение ConfigMaps и Secrets
echo "Применение ConfigMaps и Secrets..."
kubectl apply -f kubernetes/config/
kubectl apply -f kubernetes/secrets/

# Применение Traefik CRD и конфигурации
echo "Установка Traefik..."
kubectl apply -f kubernetes/traefik-crds.yaml
kubectl apply -f kubernetes/traefik-deployment.yaml
kubectl apply -f kubernetes/traefik-service.yaml
kubectl apply -f kubernetes/middleware.yaml

# Ожидание готовности Traefik
echo "Ожидание готовности Traefik..."
kubectl wait --for=condition=ready pod -l app=traefik -n messenger --timeout=300s

# Установка Kafka и Zookeeper
echo "Установка Kafka..."
kubectl apply -f kubernetes/zookeeper.yaml
kubectl apply -f kubernetes/kafka.yaml

# Ожидание готовности Kafka
echo "Ожидание готовности Kafka..."
kubectl wait --for=condition=ready pod -l app=kafka -n messenger --timeout=300s

# Применение сервисов
echo "Развертывание сервисов..."
for SERVICE in "user-service" "message-service" "call-service" "channel-service" "notification-service" "swagger-service"; do
    if [ -f "kubernetes/$SERVICE.yaml" ]; then
        echo "Развертывание $SERVICE..."
        kubectl apply -f "kubernetes/$SERVICE.yaml"
    fi
done

# Применение Ingress
echo "Применение Ingress..."
kubectl apply -f kubernetes/ingress.yaml

# Проверка статуса
echo "Проверка статуса развертывания..."
kubectl get pods -n messenger
kubectl get svc -n messenger
kubectl get ingress -n messenger

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

echo "Развертывание завершено!" 