version: '3.8'
services:
  api:
    build: .
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://postgres:agrivision@db:5432/agrivision
      - JWT_SECRET=dev-secret-change-in-production
      - NODE_ENV=development
    depends_on: [db]
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: agrivision
      POSTGRES_PASSWORD: agrivision
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
