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
    
    # Добавляем imagePullPolicy: Never для использования локальных образов
    $content = $content -replace '(image: .*)\n', '$1' + "`n        imagePullPolicy: Never`n"
    
    # Удаляем секцию imagePullSecrets если она есть
    $content = $content -replace '(?ms)      imagePullSecrets:.*?\n      containers:', '      containers:'
    
    Set-Content $file $content
}

# Список файлов для обновления
$configs = @(
    "kubernetes/user-service.yaml",
    "kubernetes/message-service.yaml",
    "kubernetes/channel-service.yaml",
    "kubernetes/notification-service.yaml"
)

foreach ($config in $configs) {
    if (Test-Path $config) {
        Update-ImageInYaml $config
    } else {
        Write-Host "Файл $config не найден, пропускаем..." -ForegroundColor Yellow
    }
}

Write-Status "Конфигурации обновлены!" 