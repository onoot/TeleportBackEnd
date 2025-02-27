#!/bin/bash

# Функция для проверки успешности выполнения команды
check_error() {
    if [ $? -ne 0 ]; then
        echo "Ошибка: $1"
        exit 1
    fi
}

# Функция для установки Docker на разных ОС
install_docker() {
    echo "Установка Docker..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install docker
        check_error "Не удалось установить Docker"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        sudo usermod -aG docker $USER
        check_error "Не удалось установить Docker"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        # Windows
        echo "Для Windows, пожалуйста, установите Docker Desktop с https://www.docker.com/products/docker-desktop"
        read -p "После установки Docker Desktop нажмите Enter для продолжения..."
    fi
}

# Функция для установки kubectl
install_kubectl() {
    echo "Установка kubectl..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install kubectl
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        curl -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
        mkdir -p "$HOME/bin"
        mv kubectl.exe "$HOME/bin/"
        export PATH="$HOME/bin:$PATH"
    fi
    check_error "Не удалось установить kubectl"
}

# Функция для установки minikube
install_minikube() {
    echo "Установка Minikube..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install minikube
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
        sudo install minikube-linux-amd64 /usr/local/bin/minikube
        rm minikube-linux-amd64
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe
        mkdir -p "$HOME/bin"
        mv minikube-windows-amd64.exe "$HOME/bin/minikube.exe"
        export PATH="$HOME/bin:$PATH"
    fi
    check_error "Не удалось установить Minikube"
}

# Функция для настройки git-crypt
setup_git_crypt() {
    echo "Настройка git-crypt..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install git-crypt
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install -y git-crypt
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "Для Windows, пожалуйста, установите git-crypt вручную с https://github.com/AGWA/git-crypt/releases"
        read -p "После установки git-crypt нажмите Enter для продолжения..."
    fi
    check_error "Не удалось установить git-crypt"

    # Проверяем наличие ключа
    if [ ! -f "../secret.key" ]; then
        echo "Ключ git-crypt не найден. Требуется файл secret.key от администратора проекта."
        exit 1
    fi

    git-crypt unlock ../secret.key
    check_error "Не удалось разблокировать секреты с помощью git-crypt"
}

# Функция для запуска minikube и настройки окружения
start_minikube() {
    echo "Запуск Minikube..."
    minikube start --driver=docker --memory=4096 --cpus=2
    check_error "Не удалось запустить Minikube"

    # Включаем необходимые аддоны
    minikube addons enable ingress
    minikube addons enable metrics-server
}

# Функция для развертывания приложения
deploy_application() {
    echo "Развертывание приложения..."

    # Создаем namespace
    kubectl create namespace messenger
    
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

    echo "Ожидание запуска подов..."
    kubectl wait --for=condition=ready pod -l app=user-service -n messenger --timeout=300s
    kubectl wait --for=condition=ready pod -l app=notification-service -n messenger --timeout=300s
}

# Основная логика скрипта
main() {
    echo "Начало установки и развертывания..."

    # Проверяем наличие необходимых утилит и устанавливаем их при необходимости
    if ! command -v docker &> /dev/null; then
        install_docker
    fi

    if ! command -v kubectl &> /dev/null; then
        install_kubectl
    fi

    if ! command -v minikube &> /dev/null; then
        install_minikube
    fi

    # Настраиваем git-crypt
    setup_git_crypt

    # Запускаем minikube
    start_minikube

    # Разворачиваем приложение
    deploy_application

    echo "Установка и развертывание завершены успешно!"
    echo "Для доступа к приложению выполните: minikube service list -n messenger"
}

# Запуск скрипта
main 