FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости через npm
RUN npm install --legacy-peer-deps

# Копируем остальной код
COPY . .

# Собираем проект
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
