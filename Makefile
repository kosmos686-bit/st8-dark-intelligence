.PHONY: setup build up down migrate seed dev logs shell-backend db-shell ch-shell migration test-ai forecast prod-build prod-up

# ─── ПЕРВЫЙ ЗАПУСК ────────────────────────────────────────────────
setup:
	cp .env.example .env
	@echo "✅ .env создан — заполни переменные!"
	python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(32))"

build:
	docker compose build --no-cache

up:
	docker compose up -d
	@echo "✅ Стек запущен"
	@echo "   Backend:    http://localhost:8000/docs"
	@echo "   Frontend:   http://localhost:3000"
	@echo "   ClickHouse: http://localhost:8123"

down:
	docker compose down

# ─── МИГРАЦИИ ─────────────────────────────────────────────────────
migrate:
	docker compose exec backend alembic upgrade head

migration:
	docker compose exec backend alembic revision --autogenerate -m "$(msg)"

seed:
	docker compose exec backend python -m app.seed

# ─── РАЗРАБОТКА ───────────────────────────────────────────────────
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-celery:
	docker compose logs -f celery_worker celery_beat

# ─── ШЕЛЛЫ ────────────────────────────────────────────────────────
shell-backend:
	docker compose exec backend bash

db-shell:
	docker compose exec postgres psql -U st8 -d st8dark

ch-shell:
	docker compose exec clickhouse clickhouse-client --user st8 --password $(CLICKHOUSE_PASSWORD)

redis-shell:
	docker compose exec redis redis-cli -a $(REDIS_PASSWORD)

# ─── AI ───────────────────────────────────────────────────────────
test-ai:
	docker compose exec backend python -m app.ai.test_all

forecast:
	docker compose exec celery_worker celery -A app.tasks.celery_app call app.tasks.forecast_tasks.run_all_forecasts

# ─── PRODUCTION ───────────────────────────────────────────────────
prod-build:
	docker compose build
	@echo "✅ Production build готов"

prod-up:
	docker compose up -d
	docker compose exec backend alembic upgrade head
	@echo "✅ Production запущен"

# ─── УТИЛИТЫ ──────────────────────────────────────────────────────
health:
	@curl -s http://localhost:8000/health | python3 -m json.tool

clean:
	docker compose down -v --remove-orphans
	@echo "⚠️  Все данные удалены!"
