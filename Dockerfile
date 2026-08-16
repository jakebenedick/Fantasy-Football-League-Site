FROM node:22-bookworm-slim AS web-build
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
RUN npm ci --prefix apps/web
COPY apps/web ./apps/web
RUN STATIC_EXPORT=1 npm run build --prefix apps/web

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static

WORKDIR /app
COPY apps/api/pyproject.toml ./apps/api/pyproject.toml
COPY apps/api/app ./apps/api/app
RUN python -m pip install --no-cache-dir ./apps/api
COPY --from=web-build /app/apps/web/.next-build /app/static

EXPOSE 10000
CMD ["sh", "-c", "uvicorn app.main:app --app-dir apps/api --host 0.0.0.0 --port ${PORT:-10000}"]
