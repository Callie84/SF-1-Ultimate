# =============================================================
# SF-1 Ultimate — Makefile
# Verwendung: make <ziel>
# =============================================================

.PHONY: help logs restart status backup shell-mongo shell-postgres shell-redis \
        restart-frontend restart-auth restart-community restart-journal \
        restart-price restart-search restart-ai restart-tools \
        build ps clean-logs

# Standard-Ziel: Hilfe anzeigen
help:
	@echo ""
	@echo "SF-1 Ultimate — Verfügbare Befehle:"
	@echo ""
	@echo "  make logs              Alle Service-Logs verfolgen"
	@echo "  make logs-frontend     Nur Frontend-Logs"
	@echo "  make logs-auth         Nur Auth-Service-Logs"
	@echo "  make ps                Container-Status anzeigen"
	@echo "  make status            Detaillierter Service-Status"
	@echo ""
	@echo "  make restart           Alle Services neu starten (VORSICHT)"
	@echo "  make restart-frontend  Frontend neu bauen (~8 Min)"
	@echo "  make restart-auth      Auth-Service neu starten"
	@echo "  make restart-community Community-Service neu starten"
	@echo "  make restart-journal   Journal-Service neu starten"
	@echo "  make restart-price     Price-Service neu starten"
	@echo "  make restart-search    Search-Service neu starten"
	@echo "  make restart-ai        AI-Service neu starten"
	@echo ""
	@echo "  make backup            Backup manuell triggern"
	@echo "  make backup-list       Liste aller Backups"
	@echo ""
	@echo "  make shell-mongo       MongoDB Shell öffnen"
	@echo "  make shell-postgres    PostgreSQL Shell öffnen"
	@echo "  make shell-redis       Redis CLI öffnen"
	@echo ""
	@echo "  make build             Frontend neu bauen"
	@echo ""

# Logs
logs:
	docker-compose logs -f --tail=50

logs-frontend:
	docker logs sf1-frontend -f --tail=50

logs-auth:
	docker logs sf1-auth-service -f --tail=50

logs-community:
	docker logs sf1-community-service -f --tail=50

logs-journal:
	docker logs sf1-journal-service -f --tail=50

logs-price:
	docker logs sf1-price-service -f --tail=50

# Container-Status
ps:
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep sf1

status:
	@echo "=== SF-1 Container Status ==="
	@docker ps --format "table {{.Names}}\t{{.Status}}" | grep sf1
	@echo ""
	@echo "=== Disk Usage ==="
	@df -h / | tail -1
	@echo ""
	@echo "=== Backups ==="
	@ls -lh /root/SF-1-Ultimate-/backups/*.tar.gz 2>/dev/null | tail -5 || echo "Keine Backups gefunden"

# Services neu starten
restart:
	@echo "WARNUNG: Alle Services werden neu gestartet!"
	@echo "Drücke Ctrl+C zum Abbrechen, Enter zum Fortfahren..."
	@read confirm
	docker-compose restart

restart-frontend:
	docker-compose restart frontend
	@echo "Build läuft (~8 Min)..."
	@sleep 10
	@docker logs sf1-frontend --tail 5

restart-auth:
	docker-compose restart auth-service
	@sleep 3
	@docker logs sf1-auth-service --tail 10

restart-community:
	docker-compose restart community-service
	@sleep 3
	@docker logs sf1-community-service --tail 10

restart-journal:
	docker-compose restart journal-service
	@sleep 3
	@docker logs sf1-journal-service --tail 10

restart-price:
	docker-compose restart price-service
	@sleep 3
	@docker logs sf1-price-service --tail 10

restart-search:
	docker-compose restart search-service
	@sleep 3
	@docker logs sf1-search-service --tail 10

restart-ai:
	docker-compose restart ai-service
	@sleep 3
	@docker logs sf1-ai-service --tail 10

restart-tools:
	docker-compose restart tools-service
	@sleep 3
	@docker logs sf1-tools-service --tail 10

# Backup
backup:
	@JWT=$$(docker exec sf1-auth-service node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({userId:'admin',role:'ADMIN'},process.env.JWT_SECRET))" 2>/dev/null); \
	curl -s -X POST http://172.28.0.24:3011/api/backup/backups/trigger \
	  -H "Authorization: Bearer $$JWT" | python3 -m json.tool 2>/dev/null || echo "Backup getriggert"

backup-list:
	@ls -lh /root/SF-1-Ultimate-/backups/*.tar.gz 2>/dev/null || echo "Keine Backups gefunden"

# Datenbank-Shells
shell-mongo:
	docker exec -it sf1-mongodb mongosh -u sf1_admin -p "$$MONGO_PASSWORD" --authenticationDatabase admin

shell-postgres:
	docker exec -it sf1-postgres psql -U sf1_user -d sf1_auth

shell-redis:
	docker exec -it sf1-redis redis-cli -a "$$REDIS_PASSWORD"

# Build
build: restart-frontend
