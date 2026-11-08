# FinAI frontend — static build served by nginx (dev uses `npm run dev`).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Single-page app: unknown paths fall back to index.html; /api proxies to the API
# container. index.html is never cached (hashed /assets are cached for a year),
# so a rebuild is picked up by browsers on the next normal reload.
RUN printf 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    location /api/ { proxy_pass http://api:8000; proxy_set_header Host $host; } \
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; } \
    location = /index.html { add_header Cache-Control "no-cache"; } \
    location / { try_files $uri /index.html; add_header Cache-Control "no-cache"; } \
  }\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
