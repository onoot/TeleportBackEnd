#!/bin/bash

# Проверяем наличие git-crypt
if ! command -v git-crypt &> /dev/null; then
    echo "git-crypt не установлен. Устанавливаем..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install git-crypt
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y git-crypt
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        echo "Для Windows, пожалуйста, установите git-crypt вручную с https://github.com/AGWA/git-crypt/releases"
        exit 1
    fi
fi

# Проверяем наличие ключа
if [ ! -f "../secret.key" ]; then
    echo "Ключ git-crypt не найден. Инициализируем новый..."
    git-crypt init
    git-crypt export-key ../secret.key
    echo "Ключ сохранен в ../secret.key"
else
    echo "Используем существующий ключ git-crypt"
    git-crypt unlock ../secret.key
fi

# Применяем секреты в кластер
echo "Применяем секреты в кластер..."
kubectl apply -f kubernetes/secrets/app-secrets.yaml

echo "Готово! Секреты настроены и зашифрованы."
echo "Важно: сохраните файл secret.key в надежном месте и передайте его другим разработчикам." 