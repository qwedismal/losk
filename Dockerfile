# Production image for «Лоск» (Next.js 15 + SQLite + local uploads).
#
# The site URL is baked into the build because Next.js inlines NEXT_PUBLIC_*:
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://losk.example -t losk .
#
# Data lives in /app/data and MUST be a persistent volume, otherwise requests,
# photos and VAPID keys disappear on redeploy (see DEPLOY.md).

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3210
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3210 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/data

COPY --from=build /app ./
RUN mkdir -p /app/data && chown -R node:node /app
USER node

VOLUME ["/app/data"]
EXPOSE 3210

CMD ["npm", "start"]
