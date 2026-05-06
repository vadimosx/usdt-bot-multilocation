FROM node:20-alpine

WORKDIR /app

# Устанавливаем pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Копируем package.json и pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем остальной код
COPY . .

# Собираем проект
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
