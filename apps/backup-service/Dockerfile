FROM node:20-slim

# Install mongodump (mongodb-database-tools) + pg_dump (postgresql-client)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gnupg ca-certificates \
    && curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
       | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" \
       > /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       mongodb-database-tools \
       postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build

CMD ["node", "dist/index.js"]
