#!/bin/bash

# Проверка наличия необходимых утилит
command -v gcloud >/dev/null 2>&1 || { echo "Требуется установить gcloud CLI"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "Требуется установить kubectl"; exit 1; }

# Установка переменных окружения
if [ -z "$PROJECT_ID" ]; then
    echo "Ошибка: Переменная PROJECT_ID не установлена"
    echo "Используйте: export PROJECT_ID=your-project-id"
    exit 1
fi

REGION="europe-central2"
ZONE="europe-central2-b"
CLUSTER_NAME="messenger-cluster"

# Настройка Google Cloud
echo "Настройка Google Cloud..."
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE

# Создание VPC и подсетей
echo "Создание VPC и подсетей..."
if ! gcloud compute networks describe messenger-network &>/dev/null; then
    gcloud compute networks create messenger-network \
        --subnet-mode=custom \
        --bgp-routing-mode=regional
fi

if ! gcloud compute networks subnets describe messenger-subnet --region=$REGION &>/dev/null; then
    gcloud compute networks subnets create messenger-subnet \
        --network=messenger-network \
        --region=$REGION \
        --range=10.0.0.0/20 \
        --secondary-range=pods=10.48.0.0/14,services=10.52.0.0/20 \
        --enable-private-ip-google-access
fi

# Создание Cloud Router и NAT
echo "Создание Cloud Router и NAT..."
if ! gcloud compute routers describe messenger-router --region=$REGION &>/dev/null; then
    gcloud compute routers create messenger-router \
        --network=messenger-network \
        --region=$REGION
fi

if ! gcloud compute routers nats describe messenger-nat --router=messenger-router --region=$REGION &>/dev/null; then
    gcloud compute routers nats create messenger-nat \
        --router=messenger-router \
        --region=$REGION \
        --nat-all-subnet-ip-ranges \
        --auto-allocate-nat-external-ips
fi

# Создание правил брандмауэра
echo "Создание правил брандмауэра..."
if ! gcloud compute firewall-rules describe messenger-allow-internal &>/dev/null; then
    gcloud compute firewall-rules create messenger-allow-internal \
        --network=messenger-network \
        --allow=tcp,udp,icmp \
        --source-ranges=10.0.0.0/20,10.48.0.0/14,10.52.0.0/20
fi

if ! gcloud compute firewall-rules describe messenger-allow-health-checks &>/dev/null; then
    gcloud compute firewall-rules create messenger-allow-health-checks \
        --network=messenger-network \
        --allow=tcp \
        --source-ranges=35.191.0.0/16,130.211.0.0/22
fi

# Создание кластера GKE
echo "Создание кластера GKE..."
gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --network=messenger-network \
    --subnetwork=messenger-subnet \
    --enable-ip-alias \
    --enable-private-nodes \
    --master-ipv4-cidr=172.16.0.0/28 \
    --enable-master-authorized-networks \
    --master-authorized-networks=0.0.0.0/0 \
    --num-nodes=1 \
    --machine-type=e2-small \
    --disk-type=pd-standard \
    --disk-size=30 \
    --enable-network-policy \
    --workload-pool=$PROJECT_ID.svc.id.goog \
    || {
        echo "Ошибка при создании кластера. Очистка ресурсов..."
        gcloud compute firewall-rules delete messenger-allow-health-checks --quiet
        gcloud compute firewall-rules delete messenger-allow-internal --quiet
        gcloud compute routers nats delete messenger-nat --router=messenger-router --region=$REGION --quiet
        gcloud compute routers delete messenger-router --region=$REGION --quiet
        gcloud compute networks subnets delete messenger-subnet --region=$REGION --quiet
        gcloud compute networks delete messenger-network --quiet
        exit 1
    }

# Получение учетных данных кластера
echo "Получение учетных данных кластера..."
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION

echo "Настройка Google Cloud завершена!"