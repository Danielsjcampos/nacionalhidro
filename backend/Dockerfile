FROM node:18-alpine

WORKDIR /app

# Instalar dependências necessárias para o canvas/pdf-parse se precisar
RUN apk add --no-cache build-base poppler-utils cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev

COPY package*.json ./
RUN npm install

COPY . .

# Gerar Prisma client e build do TypeScript
RUN npm run build

EXPOSE 3000

# Script para rodar as migrations antes de iniciar e iniciar o app
# Usando ts-node para o seed caso necessário
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
