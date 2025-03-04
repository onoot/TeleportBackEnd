#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Проверка наличия необходимых инструментов
check_requirements() {
    log "Проверка необходимых инструментов..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl не установлен"
        exit 1
    fi
}

# Проверка доступа к кластеру
check_cluster() {
    log "Проверка доступа к кластеру Kubernetes..."
    if ! kubectl cluster-info &> /dev/null; then
        error "Нет доступа к кластеру Kubernetes"
        exit 1
    fi
    log "Доступ к кластеру подтвержден"
}

# Создание namespace если не существует
create_namespace() {
    log "Создание namespace messenger..."
    if ! kubectl get namespace messenger &> /dev/null; then
        kubectl create namespace messenger
        log "Namespace messenger создан"
    else
        log "Namespace messenger уже существует"
    fi
}

# Применение конфигураций Kubernetes
apply_configs() {
    log "Применение конфигураций Kubernetes..."
    
    # Применяем базовые конфигурации
    log "Применение базовых конфигураций..."
    kubectl apply -f kubernetes/namespace.yaml
    kubectl apply -f kubernetes/configmap.yaml
    kubectl apply -f kubernetes/secrets.yaml
    kubectl apply -f kubernetes/network-config.yaml
    kubectl apply -f kubernetes/swagger-service.yaml
    
    # Применяем конфигурации сервисов
    log "Применение конфигураций сервисов..."
    services=(
        "user-service.yaml"
        "message-service.yaml"
        "channel-service.yaml"
        "call-service.yaml"
        "notification-service.yaml"
        "swagger-config.yaml"
    )
    
    for service in "${services[@]}"; do
        log "Применение $service..."
        kubectl apply -f kubernetes/$service
    done
    
    # Применяем ingress
    log "Применение ingress..."
    kubectl apply -f kubernetes/ingress.yaml
}

# Проверка статуса развертывания
check_deployment() {
    log "Проверка статуса развертывания..."
    
    # Список всех необходимых сервисов
    required_services=(
        "call-service"
        "channel-service"
        "message-service"
        "notification-service"
        "swagger-service"
        "user-service"
    )
    
    # Ждем готовности всех подов
    log "Ожидание готовности подов..."
    kubectl wait --for=condition=ready pod -l app -n messenger --timeout=300s
    
    # Проверяем статус всех компонентов
    log "Полный статус развертывания:"
    kubectl get pods,svc,ingress -n messenger -o wide
    
    # Проверяем статус каждого сервиса
    log "Проверка статуса отдельных сервисов:"
    for service in "${required_services[@]}"; do
        log "Статус $service:"
        kubectl get pods -n messenger -l app=$service -o wide
    done
    
    # Проверяем доступность сервисов
    log "Статус сервисов:"
    kubectl get services -n messenger
    
    log "Статус ingress:"
    kubectl get ingress -n messenger
}

# Основная функция
main() {
    log "Начало развертывания..."
    
    check_requirements
    check_cluster
    create_namespace
    apply_configs
    check_deployment
    
    log "Развертывание завершено успешно!"
    log "Проверьте доступность сервисов через ingress"
}

# Запуск скрипта
main 