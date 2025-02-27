#!/bin/sh

echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_INTERVAL=2

for i in $(seq 1 $MAX_RETRIES); do
    if node dist/src/utils/init-db.js > /dev/null 2>&1; then
        echo "Database is ready and tables are created"
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "Failed to initialize database after $MAX_RETRIES attempts"
        exit 1
    fi
    
    echo "Attempt $i of $MAX_RETRIES. Retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
done

echo "Starting application..."
exec node dist/src/index.js 