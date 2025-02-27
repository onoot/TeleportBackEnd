#!/bin/bash

# Функция для проверки ошибок
check_error() {
    if [ $? -ne 0 ]; then
        echo "Ошибка: $1"
        exit 1
    fi
}

# Проверка наличия необходимых утилит
check_requirements() {
    echo "Проверка необходимых утилит..."
    
    if ! command -v docker &> /dev/null; then
        echo "Установка Docker..."
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        sudo usermod -aG docker $USER
        check_error "Не удалось установить Docker"
    fi

    if ! command -v kubectl &> /dev/null; then
        echo "Установка kubectl..."
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl
        check_error "Не удалось установить kubectl"
    fi

    if ! command -v git-crypt &> /dev/null; then
        echo "Установка git-crypt..."
        sudo apt-get update
        sudo apt-get install -y git-crypt
        check_error "Не удалось установить git-crypt"
    fi
}

# Настройка git-crypt и разблокировка секретов
setup_secrets() {
    echo "Настройка секретов..."
    
    if [ ! -f "../secret.key" ]; then
        echo "Ошибка: Файл secret.key не найден. Поместите его в родительскую директорию проекта."
        exit 1
    fi

    git-crypt unlock ../secret.key
    check_error "Не удалось разблокировать секреты"
}

# Настройка подключения к кластеру
setup_cluster() {
    echo "Настройка подключения к кластеру..."
    
    if [ ! -f "$HOME/.kube/config" ]; then
        echo "Ошибка: Файл конфигурации kubectl не найден. Убедитесь, что кластер настроен."
        exit 1
    fi

    # Проверка подключения к кластеру
    kubectl cluster-info
    check_error "Не удалось подключиться к кластеру"
}

# Развертывание приложения
deploy_application() {
    echo "Развертывание приложения..."

    # Создаем namespace если он не существует
    kubectl create namespace messenger --dry-run=client -o yaml | kubectl apply -f -

    # Применяем секреты
    echo "Применение секретов..."
    kubectl apply -f kubernetes/secrets/messenger-secrets.yaml
    check_error "Не удалось применить секреты"

    # Применяем базовые манифесты
    echo "Применение базовых манифестов..."
    kubectl apply -f kubernetes/base/
    check_error "Не удалось применить базовые манифесты"

    # Применяем production манифесты
    echo "Применение production манифестов..."
    kubectl apply -f kubernetes/overlays/prod/
    check_error "Не удалось применить production манифесты"

    # Ждем запуска подов
    echo "Ожидание запуска подов..."
    kubectl wait --for=condition=ready pod -l app=user-service -n messenger --timeout=300s
    kubectl wait --for=condition=ready pod -l app=notification-service -n messenger --timeout=300s

    # Проверяем статус подов
    echo "Статус подов:"
    kubectl get pods -n messenger
}

# Основная логика
main() {
    echo "Начало развертывания на Ubuntu сервере..."

    # Проверяем и устанавливаем необходимые утилиты
    check_requirements

    # Настраиваем git-crypt и разблокируем секреты
    setup_secrets

    # Настраиваем подключение к кластеру
    setup_cluster

    # Разворачиваем приложение
    deploy_application

    echo "Развертывание завершено успешно!"
    echo "Проверьте статус сервисов: kubectl get services -n messenger"
}

# Запуск скрипта
main 