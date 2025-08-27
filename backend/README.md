# Backend - Credit Card Analytics

## Como rodar localmente

1. Suba o ambiente com Docker Compose:

```sh
docker-compose up --build
```

2. O backend estará disponível em `http://localhost:4000`.
3. O banco de dados Postgres estará disponível em `localhost:5432` (usuário: `carduser`, senha: `cardpass`, banco: `carddb`).

## Inicialização do banco

O banco será criado automaticamente. Para rodar o script de criação de tabela manualmente:

```sh
docker-compose exec db psql -U carduser -d carddb -f /app/init.sql
```

## Endpoints
- `POST /api/upload` (upload de CSV)
- `GET /api/expenses` (listar despesas)
