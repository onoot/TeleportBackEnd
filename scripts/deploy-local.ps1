# Функция для проверки наличия команды
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Функция для вывода статуса
function Write-Status($message) {
    Write-Host "==> $message" -ForegroundColor Green
}

# Функция для обновления image в yaml файле
function Update-ImageInYaml($file) {
    Write-Status "Обновление $file..."
    $content = Get-Content $file -Raw
    
    # Заменяем gcr.io образы на локальные
    $content = $content -replace 'gcr\.io/teleport-450320/([^:]+):latest', 'local/$1:latest'
    
    # Добавляем imagePullPolicy: Never только если его еще нет
    if ($content -notmatch 'imagePullPolicy: Never') {
        $content = $content -replace '(image:.+)(\r?\n)', '$1$2          imagePullPolicy: Never$2'
    }
    
    # Удаляем секцию imagePullSecrets если она есть
    $content = $content -replace '(?ms)\s+imagePullSecrets:.*?\n\s+containers:', '      containers:'
    
    Set-Content $file $content -Encoding UTF8
}

# Проверка и установка необходимых компонентов
Write-Status "Проверка необходимых компонентов..."

# Проверка Docker
if (-not (Test-Command "docker")) {
    Write-Host "Docker не установлен. Пожалуйста, установите Docker Desktop с https://www.docker.com/products/docker-desktop" -ForegroundColor Red
    exit 1
}

# Проверка kubectl
if (-not (Test-Command "kubectl")) {
    Write-Host "kubectl не установлен. Установка..." -ForegroundColor Yellow
    curl.exe -LO "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe"
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin"
    Move-Item -Force kubectl.exe "$env:USERPROFILE\bin\kubectl.exe"
    $env:Path += ";$env:USERPROFILE\bin"
}

# Проверка minikube
if (-not (Test-Command "minikube")) {
    Write-Host "minikube не установлен. Установка..." -ForegroundColor Yellow
    curl.exe -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-windows-amd64.exe
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\bin"
    Move-Item -Force minikube-windows-amd64.exe "$env:USERPROFILE\bin\minikube.exe"
    $env:Path += ";$env:USERPROFILE\bin"
}

# Запуск minikube если не запущен
Write-Status "Проверка статуса minikube..."
$minikubeStatus = minikube status | Out-String
if ($minikubeStatus -match "Stopped|Nonexistent") {
    Write-Status "Запуск minikube..."
    minikube start --driver=docker --memory=4096 --cpus=2
    
    Write-Status "Включение необходимых аддонов..."
    minikube addons enable ingress
    minikube addons enable metrics-server
}

# Настройка Docker для работы с minikube
Write-Status "Настройка Docker для работы с minikube..."
minikube docker-env | Invoke-Expression

# Переходим в корневую директорию проекта
$rootPath = Split-Path -Parent $PSScriptRoot

# Сборка образов
$services = @(
    "user-service",
    "message-service",
    "channel-service",
    "notification-service",
    "swagger-service"
)

foreach ($service in $services) {
    Write-Status "Сборка образа для $service..."
    $servicePath = Join-Path -Path $rootPath -ChildPath "src" | Join-Path -ChildPath "services" | Join-Path -ChildPath $service
    if (Test-Path $servicePath) {
        docker build -t "local/$service`:latest" $servicePath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Ошибка при сборке образа $service" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Директория $servicePath не найдена, пропускаем..." -ForegroundColor Yellow
    }
}

# Обновление конфигураций для использования локальных образов
$configs = @(
    "kubernetes/user-service.yaml",
    "kubernetes/message-service.yaml",
    "kubernetes/channel-service.yaml",
    "kubernetes/notification-service.yaml",
    "kubernetes/swagger-service.yaml"
)

foreach ($config in $configs) {
    $configPath = Join-Path -Path $rootPath -ChildPath $config
    if (Test-Path $configPath) {
        Update-ImageInYaml $configPath
    } else {
        Write-Host "Файл $configPath не найден, пропускаем..." -ForegroundColor Yellow
    }
}

# Применение конфигураций Kubernetes
Write-Status "Применение конфигураций Kubernetes..."

# Создание namespace если не существует
kubectl get namespace messenger 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Status "Создание namespace messenger..."
    kubectl create namespace messenger
}

# Применение конфигураций в правильном порядке
$configs = @(
    "kubernetes/secrets.yaml",
    "kubernetes/configmap.yaml",
    "kubernetes/rbac.yaml",
    "kubernetes/swagger-config.yaml",
    "kubernetes/user-service.yaml",
    "kubernetes/message-service.yaml",
    "kubernetes/channel-service.yaml",
    "kubernetes/notification-service.yaml",
    "kubernetes/swagger-service.yaml",
    "kubernetes/traefik-deployment.yaml",
    "kubernetes/ingress.yaml"
)

foreach ($config in $configs) {
    $configPath = Join-Path -Path $rootPath -ChildPath $config
    if (Test-Path $configPath) {
        Write-Status "Применение $config..."
        kubectl apply -f $configPath
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Ошибка при применении $config" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Файл $config не найден, пропускаем..." -ForegroundColor Yellow
    }
}

# Ожидание запуска подов
Write-Status "Ожидание запуска подов..."
kubectl wait --for=condition=ready pod -l app=user-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=message-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=channel-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=notification-service -n messenger --timeout=300s
kubectl wait --for=condition=ready pod -l app=swagger-service -n messenger --timeout=300s

# Вывод информации о доступе
Write-Status "Развертывание завершено!"
Write-Status "Список сервисов:"
kubectl get services -n messenger

Write-Status "Для доступа к сервисам используйте:"
Write-Host "minikube service list -n messenger"
