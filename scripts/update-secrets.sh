#!/bin/bash

# Проверяем наличие необходимых утилит
command -v gh >/dev/null 2>&1 || { echo "Требуется GitHub CLI (gh). Установите: https://cli.github.com/"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "Требуется kubectl"; exit 1; }

# Проверяем авторизацию в GitHub CLI
if ! gh auth status &>/dev/null; then
    echo "Пожалуйста, авторизуйтесь в GitHub CLI: gh auth login"
    exit 1
fi

# Получаем имя репозитория
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
if [ -z "$REPO" ]; then
    echo "Не удалось получить информацию о репозитории"
    exit 1
fi

echo "Обновление секретов для репозитория: $REPO"

# Обновляем KUBE_CONFIG
echo "Обновление KUBE_CONFIG..."
KUBE_CONFIG=$(cat ~/.kube/config | base64 -w 0)
if [ $? -eq 0 ] && [ ! -z "$KUBE_CONFIG" ]; then
    echo "$KUBE_CONFIG" | gh secret set KUBE_CONFIG
    echo "KUBE_CONFIG успешно обновлен"
else
    echo "Ошибка при получении KUBE_CONFIG"
    exit 1
fi

# Обновляем MESSENGER_SECRETS
echo "Обновление MESSENGER_SECRETS..."
if [ -f "kubernetes/secrets/messenger-secrets.yaml" ]; then
    MESSENGER_SECRETS=$(cat kubernetes/secrets/messenger-secrets.yaml | base64 -w 0)
    if [ $? -eq 0 ] && [ ! -z "$MESSENGER_SECRETS" ]; then
        echo "$MESSENGER_SECRETS" | gh secret set MESSENGER_SECRETS
        echo "MESSENGER_SECRETS успешно обновлен"
    else
        echo "Ошибка при кодировании MESSENGER_SECRETS"
        exit 1
    fi
else
    echo "Файл kubernetes/secrets/messenger-secrets.yaml не найден"
    exit 1
fi

echo "Все секреты успешно обновлены!" 