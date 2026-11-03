# Hakujina frontend

Next.js app for the Hakujina pottery studio. It includes a studio landing page,
email/password login, account registration, and the email-verification page.

## Run locally

1. Start the Django API from `backend/` on `http://localhost:8000`.
2. Set `FRONTEND_URL=http://localhost:3000` in the backend environment so
   verification emails return to this app.
3. From this folder, install dependencies and start Next.js:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set
`NEXT_PUBLIC_API_URL` in `.env.local` if the Django API is not at
`http://localhost:8000/api/v1`. You can copy `.env.example` to `.env.local`
for the default local setup.

In development, Django uses its console email backend unless SMTP is configured,
so verification links are printed in the backend terminal.
