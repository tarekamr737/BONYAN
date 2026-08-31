FROM python:3.13-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY apps/api /build/apps/api
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install /build/apps/api

FROM python:3.13-slim AS runtime

ENV PATH=/opt/venv/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN groupadd --system --gid 10001 bonyan \
    && useradd --system --uid 10001 --gid bonyan --home-dir /nonexistent bonyan \
    && mkdir -p /var/lib/bonyan/private \
    && chown -R bonyan:bonyan /var/lib/bonyan

COPY --from=builder /opt/venv /opt/venv
COPY apps/api/alembic /app/alembic
COPY apps/api/alembic.ini /app/alembic.ini
USER 10001:10001
WORKDIR /app
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
