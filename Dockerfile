# Giai đoạn build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy các file cấu hình package
COPY package.json yarn.lock* bun.lockb* ./
# Cài đặt dependencies (sử dụng bun vì thấy có bun.lock trong hình của bạn)
RUN npm install -g bun && bun install

# Copy toàn bộ mã nguồn
COPY . .

# Khai báo các biến ENV lúc build (Next.js cần để đóng gói)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

RUN bun run build

# Giai đoạn chạy (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy các file cần thiết từ builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]