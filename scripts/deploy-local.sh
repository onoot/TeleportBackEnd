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
    
    if ! command -v minikube &> /dev/null; then
        error "minikube не установлен"
        exit 1
    fi
}

# Запуск minikube если не запущен
start_minikube() {
    log "Проверка статуса minikube..."
    if ! minikube status | grep -q "Running"; then
        log "Запуск minikube..."
        minikube start
    else
        log "minikube уже запущен"
    fi
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
    
    # Применяем основные конфигурации
    kubectl apply -f kubernetes/namespace.yaml
    kubectl apply -f kubernetes/configmap.yaml
    kubectl apply -f kubernetes/secrets.yaml
    
    # Применяем конфигурации сервисов
    kubectl apply -f kubernetes/user-service.yaml
    kubectl apply -f kubernetes/message-service.yaml
    kubectl apply -f kubernetes/channel-service.yaml
    kubectl apply -f kubernetes/call-service.yaml
    kubectl apply -f kubernetes/notification-service.yaml
    
    # Применяем конфигурации для мониторинга
    kubectl apply -f kubernetes/monitoring/
    
    # Применяем конфигурации для сети
    kubectl apply -f kubernetes/network-config.yaml
    kubectl apply -f kubernetes/ingress.yaml
}

# Сборка и загрузка Docker образов
build_images() {
    log "Сборка Docker образов..."
    
    # Переключаем Docker для работы с minikube
    eval $(minikube docker-env)
    
    # Сборка образов сервисов
    docker build -t local/user-service:latest ./src/services/user-service
    docker build -t local/message-service:latest ./src/services/message-service
    docker build -t local/channel-service:latest ./src/services/channel-service
    docker build -t local/call-service:latest ./src/services/call-service
    docker build -t local/notification-service:latest ./src/services/notification-service
}

# Проверка статуса развертывания
check_deployment() {
    log "Проверка статуса развертывания..."
    
    # Ждем, пока все поды будут готовы
    kubectl wait --for=condition=ready pod -l app -n messenger --timeout=300s
    
    # Проверяем статус сервисов
    kubectl get pods -n messenger
    kubectl get services -n messenger
}

# Настройка ingress
setup_ingress() {
    log "Настройка ingress..."
    
    # Включаем ingress addon в minikube
    minikube addons enable ingress
    
    # Получаем IP minikube
    MINIKUBE_IP=$(minikube ip)
    
    # Выводим информацию для настройки hosts
    echo -e "${YELLOW}Добавьте следующие записи в /etc/hosts:${NC}"
    echo "$MINIKUBE_IP api.messenger.local"
    echo "$MINIKUBE_IP docs.messenger.local"
}

# Основная функция
main() {
    log "Начало развертывания..."
    
    check_requirements
    start_minikube
    create_namespace
    build_images
    apply_configs
    check_deployment
    setup_ingress
    
    log "Развертывание завершено успешно!"
}

# Запуск скрипта
main 