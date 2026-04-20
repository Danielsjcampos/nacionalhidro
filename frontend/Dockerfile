FROM node:22-alpine AS builder

# Limite de memória e stack para evitar crash em VPS com pouca RAM
ENV NODE_OPTIONS="--max-old-space-size=4096 --stack-size=10000"
ENV VITE_CJS_IGNORE_WARNING=true
ENV DEBUG=vite:build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Argumento para URL da API em tempo de build (o Vite "carimba" isso nos arquivos JS)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Nginx para servir arquivos estáticos
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
