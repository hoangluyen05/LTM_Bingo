Database: bingo_online
1. Import LTM.sql into MySQL 8.0.16+.
2. Configure DB_URL, DB_USER and DB_PASSWORD (environment variables).
3. For local Maven run: mvn spring-boot:run
4. For Docker: docker compose up --build -d
5. The SQL schema is not auto-applied; import LTM.sql manually before first run.
6. For LAN play, configure ALLOWED_ORIGINS for the frontend origin and allow ports in firewall.


### Bingo board sizes (5 to 8)

For an existing database, run `migrate-board-size.sql` once before starting the updated backend. It preserves existing rooms with the default 5x5 size and expands number/score constraints for 8x8 boards. New installations use the updated `LTM.sql` directly and do not need this migration.


### In-game chat

Run `migrate-chat.sql` on an existing database before starting the updated backend. This creates the chat history table and can be run again safely. New installations using `LTM.sql` already include it. No database migration is run automatically.


### Draw results

Run `migrate-draw.sql` on existing installations before starting the updated backend. It adds DRAW to match player results. New installations use the updated `LTM.sql`.
