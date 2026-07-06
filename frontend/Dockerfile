# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

# VITE_* vars are inlined at build time
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_GLOBAL_ROOM_ID=1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GLOBAL_ROOM_ID=$VITE_GLOBAL_ROOM_ID

COPY . .
RUN npm run build

# --- Serve stage (nginx-free: static build served by `vite preview`) ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# vite + plugins live in node_modules; preview reads vite.config.ts at runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/vite.config.ts ./
COPY --from=build /app/dist ./dist

EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]
