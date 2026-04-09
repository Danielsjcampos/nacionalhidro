FROM node:18-alpine

WORKDIR /app

# Ignorar o download padrão do Puppeteer e baixar via APK
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Instalar dependências necessárias para o canvas/pdf-parse e puppeteer
RUN apk add --no-cache \
    build-base \
    poppler-utils \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

COPY package*.json ./
RUN npm install

COPY . .

# Gerar Prisma client e build do TypeScript
RUN npm run build

EXPOSE 3000

# Script para rodar as migrations antes de iniciar e iniciar o app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
