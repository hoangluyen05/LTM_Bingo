Database: bingo_online
1. Import LTM.sql into MySQL 8.0.16+.
2. Configure DB_URL, DB_USER and DB_PASSWORD (environment variables).
3. For local Maven run: mvn spring-boot:run
4. For Docker: docker compose up --build -d
5. The SQL schema is not auto-applied; import LTM.sql manually before first run.
6. For LAN play, configure ALLOWED_ORIGINS for the frontend origin and allow ports in firewall.
