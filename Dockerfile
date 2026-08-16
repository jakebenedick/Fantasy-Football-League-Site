FROM node:22-bookworm-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    API_PROXY_URL=http://127.0.0.1:8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/pyproject.toml ./apps/api/pyproject.toml
COPY apps/api/app ./apps/api/app
RUN python3 -m pip install --no-cache-dir ./apps/api

COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN npm ci --prefix apps/web
COPY apps/web ./apps/web
RUN npm run build --prefix apps/web

ENV NODE_ENV=production
EXPOSE 10000

CMD ["sh", "-c", "uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000 & npm start --prefix apps/web -- --hostname 0.0.0.0 --port ${PORT:-10000}"]
