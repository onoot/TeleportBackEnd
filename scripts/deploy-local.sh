#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Функция для вывода статуса
print_status() {
    echo -e "${GREEN}==> $1${NC}"
}

# Функция для проверки ошибок
check_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}Ошибка: $1${NC}"
        exit 1
    fi
}

# Проверка и установка необходимых компонентов
print_status "Проверка необходимых компонентов..."

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker не установлен. Установка...${NC}"
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    sudo usermod -aG docker $USER
    check_error "Не удалось установить Docker"
fi

# Проверка kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}kubectl не установлен. Установка...${NC}"
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm kubectl
    check_error "Не удалось установить kubectl"
fi

# Проверка minikube
if ! command -v minikube &> /dev/null; then
    echo -e "${YELLOW}minikube не установлен. Установка...${NC}"
    curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
    sudo install minikube-linux-amd64 /usr/local/bin/minikube
    rm minikube-linux-amd64
    check_error "Не удалось установить minikube"
fi

# Запуск minikube если не запущен
print_status "Проверка статуса minikube..."
if ! minikube status | grep -q "Running"; then
    print_status "Запуск minikube..."
    minikube start --driver=docker --memory=4096 --cpus=2
    check_error "Не удалось запустить minikube"
    
    print_status "Включение необходимых аддонов..."
    minikube addons enable ingress
    minikube addons enable metrics-server
fi

# Применение конфигураций Kubernetes
print_status "Применение конфигураций Kubernetes..."

# Создание namespace если не существует
if ! kubectl get namespace messenger &> /dev/null; then
    print_status "Создание namespace messenger..."
    kubectl create namespace messenger
    check_error "Не удалось создать namespace"
fi

# Список конфигураций для применения
configs=(
    "kubernetes/secrets.yaml"
    "kubernetes/configmap.yaml"
    "kubernetes/rbac.yaml"
    "kubernetes/network-config.yaml"
    "kubernetes/user-service.yaml"
    "kubernetes/message-service.yaml"
    "kubernetes/channel-service.yaml"
    "kubernetes/notification-service.yaml"
    "kubernetes/traefik-deployment.yaml"
    "kubernetes/ingress.yaml"
)

# Применение конфигураций
for config in "${configs[@]}"; do
    if [ -f "$config" ]; then
        print_status "Применение $config..."
        kubectl apply -f "$config"
        check_error "Не удалось применить $config"
    else
        echo -e "${YELLOW}Файл $config не найден, пропускаем...${NC}"
    fi
done

# Ожидание запуска подов
print_status "Ожидание запуска подов..."
kubectl wait --for=condition=ready pod -l app=user-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=message-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=channel-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=notification-service -n messenger --timeout=300s

# Вывод информации о доступе
print_status "Развертывание завершено!"
print_status "Список сервисов:"
kubectl get services -n messenger

print_status "Для доступа к сервисам используйте:"
echo "minikube service list -n messenger" 