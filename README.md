# ez-LearningAI

ez-LearningAI is a Node.js and Express backend for a textbook-aware learning assistant. It accepts PDF uploads, extracts and splits their text, creates Google Gemini embeddings, stores the resulting chunks in MongoDB, and answers student questions using vector search, recent chat history, and a Gemini text-generation model. It also provides account registration and session-based refresh-token authentication.

This is my first RAG project, built to understand the RAG concept and create some stuff using LLM.

This guide describes the application files currently in this project. It excludes `node_modules/` (installed third-party code), `uploads/` (user-provided files), `.env` (private configuration), and `package-lock.json` (generated dependency-resolution data).

## Contents

- [How the application fits together](#how-the-application-fits-together)
- [Project layout](#project-layout)
- [Set up and run](#set-up-and-run)
- [HTTP API](#http-api)
- [Code reference](#code-reference)
- [Data stored in MongoDB](#data-stored-in-mongodb)
- [Important implementation notes](#important-implementation-notes)

## How the application fits together

The application has three main request flows:

1. **Account and sessions:** `server.js` starts Express after connecting to MongoDB. The authentication routes call the user controller, which creates users and manages login sessions and refresh tokens.
2. **PDF ingestion:** a client sends a PDF to the upload route. The book controller extracts its text, splits it into overlapping chunks, embeds the chunks, then stores a book record and its chunks in MongoDB.
3. **Textbook chat:** a client sends a session ID and question to the chat route. The chat controller loads recent messages, classifies the question domain, rewrites follow-ups into standalone retrieval queries, retrieves the five best matching PDF chunks for in-domain questions, and asks Gemini to answer from those excerpts. Out-of-domain questions and empty retrievals get server-controlled fallback responses. The controller saves both messages and returns the answer and source metadata.

```text
server.js
  └─ src/app.js
       ├─ /api/auth ── user.route.js ── user.controller.js ── user/session models
       ├─ /api/pdf  ── pdf.route.js  ── book.controller.js
       │                                      ├─ pdf.service.js
       │                                      ├─ embedding.service.js ── utilis/embeddings.js
       │                                      └─ book/chunk models
       └─ /api/chat ── chat.route.js ── chat.controller.js
                                              ├─ chatHistory.model.js ── chats model
                                              ├─ ragQuery.service.js ── Gemini domain/query helpers
                                              ├─ VectorSearch.service.js ── chunk model
                                              ├─ utilis/embeddings.js
                                              ├─ utilis/ragPrompt.js
                                              └─ config/config.js ── Gemini text model
```

## Project layout

```text
.
├── server.js
├── package.json
├── README.md
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── config.js
│   │   └── db.js
│   ├── controllers/
│   │   ├── book.controller.js
│   │   ├── chat.controller.js
│   │   └── user.controller.js
│   ├── models/
│   │   ├── book.model.js
│   │   ├── chats.model.js
│   │   ├── chunk.model.js
│   │   ├── session.model.js
│   │   └── user.model.js
│   ├── routes/
│   │   ├── chat.route.js
│   │   ├── pdf.route.js
│   │   └── user.route.js
│   ├── services/
│   │   ├── chatHistory.model.js
│   │   ├── embedding.service.js
│   │   ├── pdf.service.js
│   │   ├── ragQuery.service.js
│   │   ├── storage.service.js
│   │   └── VectorSearch.service.js
│   └── utilis/
│       ├── embeddings.js
│       └── ragPrompt.js
├── postman/
│   └── globals/
│       └── workspace.globals.yaml
└── .postman/
    └── resources.yaml
```

`utilis/` is the spelling used by the existing source paths. Keep it as-is unless the directory and all import paths are deliberately renamed together.

## Set up and run

### Requirements

- Node.js with npm
- A MongoDB deployment reachable by the application
- A Google AI API key with access to the configured Gemini generation and embedding models
- A MongoDB Atlas Vector Search index for the `chunks` collection, configured to match the `embedding` field and the embedding model's vector dimensions

### Environment variables

Create a `.env` file in the project root. Do not commit real secrets.

| Variable                | Purpose                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | HTTP port. Defaults to `5000` when unset or not a number.                                                              |
| `FRONTEND_URL`          | Comma-separated allowed browser origins for CORS, including the deployed Vercel origin.                               |
| `MONGO_URI`             | MongoDB connection string.                                                                                             |
| `JWT_SECRET`            | Secret used to sign and verify access and refresh JWTs.                                                                |
| `GOOGLE_API_KEY`        | Google AI API key used by text generation and embedding code.                                                          |
| `IMAGE_KIT_PRIVATE_KEY` | ImageKit private key used if the storage helper is called.                                                             |
| `RESEND_API_KEY`        | Resend API key used to deliver contact-form messages.                                                                  |
| `RESEND_FROM_EMAIL`     | Verified sender address for Resend, for example `ez-learningAI <contact@your-domain.com>`.                             |
| `NODE_ENV`              | When set to `production`, refresh cookies are marked `secure`, and chat error details are omitted from HTTP responses. |

Example with placeholders:

```dotenv
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=<long-random-secret>
GOOGLE_API_KEY=<google-ai-api-key>
IMAGE_KIT_PRIVATE_KEY=<imagekit-private-key>
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=<verified-sender-address>
NODE_ENV=development
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The server connects to MongoDB before it begins listening. The `dev` script runs `server.js` through Nodemon. The current `test` script is a placeholder and exits with an error; no project test suite is configured in `package.json`.

### Frontend

Run the backend on port `5000`, then start the React SSR server:

```bash
cd frontend
npm install
npm run dev
```

The frontend listens on port `5173`. Set `VITE_BACKEND_URL` in `frontend/.env.local` to override the local API origin; otherwise development API calls use `http://localhost:5000`. For self-hosted production, run `npm run build` followed by `npm run start`. Configure `SITE_URL` to the canonical public origin and `API_SERVER` (or `VITE_BACKEND_URL`) to the backend origin in the frontend environment. The SSR server renders route metadata, `robots.txt`, and `sitemap.xml`, and issues permanent redirects from `/home`, `/privacy-policy`, and `/contact-us`.

#### Deploying the frontend to Vercel

Create a Vercel project for this repository and set its **Root Directory** to `frontend`. The included `vercel.json` runs `npm run build:vercel`, publishes `dist/vercel`, proxies `/api/*` requests to the Render backend, and rewrites other paths to the SPA entry point so React Router routes load on refresh. Leave `VITE_BACKEND_URL` unset in Vercel so browser API calls remain on the Vercel origin and use that proxy; this also keeps refresh-token cookies same-origin. Set the backend's `FRONTEND_URL` to your Vercel origin (and any preview origin you need). The Vercel build is client-rendered; the custom Node SSR server and its route-specific server-rendered metadata, `robots.txt`, and redirects are not used in this deployment.

The contact form sends email through Resend to `zynix011@gmail.com`; set both `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` in the backend environment to enable delivery. Without those values, the form returns an actionable configuration message and offers the direct email address.

## HTTP API

All routes use JSON unless the upload endpoint explicitly requires multipart form data. Authentication cookies are HTTP-only; send the access token in the `Authorization: Bearer <accessToken>` header where applicable.

### Authentication — `/api/auth`

| Method | Path            | Request                               | Result                                                                                               |
| ------ | --------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST` | `/register`     | JSON: `email`, `name`, `password`     | Creates a user; returns their name and email.                                                        |
| `POST` | `/login`        | JSON: `email`, `password`             | Creates a session, sets the `refreshToken` cookie, and returns an access token plus basic user data. |
| `GET`  | `/getme`        | `Authorization: Bearer <accessToken>` | Verifies the access token and returns the user's name.                                               |
| `GET`  | `/refreshToken` | `refreshToken` cookie                 | Rotates the refresh token and returns a new access token.                                            |
| `POST` | `/logout`       | `refreshToken` cookie                 | Revokes the matching session and clears the cookie.                                                  |
| `POST` | `/logoutAll`    | `refreshToken` cookie                 | Revokes all active sessions for the user and clears the cookie.                                      |

### PDF upload — `/api/pdf`

| Method | Path      | Request                                                                                         | Result                                                                                     |
| ------ | --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `POST` | `/upload` | `multipart/form-data` with a file field named `pdf`; optional text fields `title` and `subject` | Extracts and indexes the PDF, then returns its `bookId`, chunk count, and embedding count. |

If omitted, `title` defaults to the uploaded file's original name and `subject` defaults to `General`.

### Chat — `/api/chat`

| Method   | Path          | Request                                                           | Result                                                            |
| -------- | ------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `POST`   | `/query`      | JSON: `sessionId` (MongoDB ObjectId string) and non-empty `query` | Returns an AI `answer`, the `sessionId`, and retrieved `sources`. |
| `DELETE` | `/:sessionId` | A MongoDB ObjectId identifying one chat history                   | Deletes only that chat history; succeeds if it is already absent. |

The handler loads up to six recent messages and retrieves up to three relevant chunks. Each source includes `chunkId`, `bookId`, `subject`, `pageNumber`, and vector-search `score`.

### Contact — `/api/contact`

| Method | Path | Request                          | Result                                                            |
| ------ | ---- | -------------------------------- | ----------------------------------------------------------------- |
| `POST` | `/`  | JSON: `name`, `email`, `message` | Sends a validated message to `zynix011@gmail.com` through Resend. |

## Code reference

### Application entry and configuration

- **`server.js`** — Loads environment variables, imports the Express app and database connector, chooses the port, and starts the server only after the database connection succeeds. Startup errors are logged and set a failing process exit code.
- **`package.json`** — Declares the project as an ES module, lists runtime dependencies, and defines `npm run dev` to start `server.js` with Nodemon. Its current `npm test` script is a placeholder that intentionally exits with an error.
- **`src/app.js`** — Creates the Express application. It enables JSON and URL-encoded request parsing, Morgan development logging, and cookie parsing; then mounts the authentication, PDF, and chat routers under their `/api/...` prefixes.
- **`src/config/config.js`** — Loads `.env`, gathers the MongoDB, JWT, ImageKit, and Google API settings, constructs the Google Generative AI client, and exports the configured Gemini text-generation model (`gemini-3.6-flash`) as `aimodel`.
- **`src/config/db.js`** — Configures DNS servers and exports `connectDB()`, which connects Mongoose using `MONGO_URI` and logs successful connection.

### Routes

Route modules map HTTP methods and paths to controller functions. They contain little business logic.

- **`src/routes/user.route.js`** — Maps registration, login, current-user lookup, token refresh, single-session logout, and all-session logout to the corresponding user controller functions.
- **`src/routes/pdf.route.js`** — Configures Multer to hold uploaded files in memory, expects a single multipart file under the field `pdf`, and passes it to `uploadPDF`.
- **`src/routes/chat.route.js`** — Maps `POST /query` and `DELETE /:sessionId` to the chat controller.

### Controllers

- **`src/controllers/user.controller.js`**
  - `register` validates the email, name, and password fields; checks for an existing email or name; hashes the password; creates the user; and returns public user fields.
  - `login` checks the supplied credentials, creates a database session with a hashed refresh token, signs an access token, and sets the raw refresh token in an HTTP-only cookie.
  - `getMe` reads a bearer access token, verifies it, looks up the user, and returns the name.
  - `refreshToken` verifies the refresh token, finds its non-revoked session by token hash, rotates the refresh token, and issues a new access token.
  - `logout` finds the session associated with the refresh token, marks it revoked, and clears the cookie.
  - `logoutAll` verifies the refresh token, revokes all active sessions for that user, and clears the cookie.
- **`src/controllers/book.controller.js`** — Implements `uploadPDF`. It requires an uploaded file, extracts and splits PDF text, creates embeddings, verifies one embedding per chunk, creates the book record, saves the associated chunks, marks the book ready, and returns processing counts. Processing failures are logged and returned as HTTP 500 responses.
- **`src/controllers/chat.controller.js`** — Implements `handleQuery`. It validates the session ID and question, loads recent chat history, classifies the current question before retrieval, returns exact server-controlled fallbacks for non-IT questions and empty retrievals, rewrites in-domain follow-ups for retrieval, retrieves five chunks, builds the prompt, and calls the configured Gemini text model. It saves the user and assistant messages and returns the answer and source metadata. On failure it logs the error; non-production responses include the failing stage and error message.

### Services and shared utilities

- **`src/services/pdf.service.js`**
  - `extractTextFromPDF(fileBuffer)` parses PDF data from a memory buffer, rejects empty extracted text, normalizes line endings and repeated blank lines, and returns trimmed text.
  - `splitPdfText(pdfText)` rejects empty input and splits text using a shared recursive text splitter configured for 1,000-character chunks with 200-character overlap.
- **`src/services/embedding.service.js`** — `processEmbeddings(textArray)` validates that chunks were supplied and delegates embedding generation to `generateEmbeddings`.
- **`src/services/ragQuery.service.js`** — Uses Gemini structured output to classify the current question as IT/CSIT or non-IT and to rewrite follow-up questions as standalone textbook retrieval queries. Conversation history is used only to resolve incomplete references.
- **`src/utilis/embeddings.js`** — Creates a Google Generative AI embedding client using `gemini-embedding-001`. `generateEmbeddings(textChunks)` validates input, embeds each text concurrently, and returns an array of numeric vectors in input order.
- **`src/services/VectorSearch.service.js`** — `searchSimilarChunks(text, topK, filter)` embeds a query and runs a MongoDB `$vectorSearch` aggregation against the `ez-learningAI` index on the `embedding` field. It returns the highest-ranked chunks with their metadata and similarity score. `topK` defaults to four; an optional filter is passed to Atlas Vector Search.
- **`src/services/chatHistory.model.js`**
  - `saveMessages(sessionId, messages)` validates the session ID and message list, then appends timestamped messages to the chat document for that session, creating the document when needed.
  - `saveMessage(sessionId, role, content)` is a convenience wrapper that saves one message through `saveMessages`.
  - `getRecentHistory(sessionId, limit)` validates its arguments, fetches the session's chat record, and returns the last `limit` messages as role/content pairs. The default limit is ten; a session without saved messages returns an empty array.
- **`src/services/storage.service.js`** — Creates an ImageKit client using `IMAGE_KIT_PRIVATE_KEY`. `uploadBook(files)` uploads the supplied files under the `Book-z/books` folder with a time-based filename and returns ImageKit's result. This helper is not currently called by the PDF upload controller.
- **`src/utilis/ragPrompt.js`** — `buildRAGPrompt({ userQuestion, retrievedChunks, chatHistory })` formats retrieved excerpts and recent messages, creates system instructions for a concise BSc CSIT learning assistant, and returns `{ systemInstructions, userPrompt }`. Missing context or history is represented with a short fallback string.

### MongoDB models

- **`src/models/user.model.js`** — Defines the `user` collection document fields: required, unique `email`; required `name`; and required `password` hash.
- **`src/models/session.model.js`** — Defines the `session` collection fields: required reference to a user, optional user-agent, required refresh-token hash and IP, revocation flag (default `false`), and creation/update timestamps.
- **`src/models/book.model.js`** — Defines the `books` collection fields: required trimmed title and subject (subject is indexed), semester (defaults to `1`), required `fileKey`, readiness flag (defaults to `false`), and timestamps.
- **`src/models/chunk.model.js`** — Defines the `chunks` collection fields: required indexed book reference and subject, required text chunk and numeric embedding vector, optional page number, and timestamps. The vector search service queries this collection.
- **`src/models/chats.model.js`** — Defines a chat document for a session, with a unique indexed session ID and an array of messages. Each message has a required role (`user`, `assistant`, or `system`), required content, and timestamp. Chat documents also have timestamps.

### Postman workspace files

- **`.postman/resources.yaml`** — Postman workspace metadata and resource-registration configuration. It identifies the workspace and indicates that files in `postman/` are registered in Local View.
- **`postman/globals/workspace.globals.yaml`** — Defines the Postman `Globals` set; its values list is currently empty.

## Data stored in MongoDB

| Collection/model | Main purpose                                             | Relationships                            |
| ---------------- | -------------------------------------------------------- | ---------------------------------------- |
| `user`           | Account identity and password hash                       | Referenced by session documents          |
| `session`        | Refresh-token session state and revocation               | `user` points to a user                  |
| `books`          | Metadata and processing status for uploaded books        | Referenced by chunks through `bookId`    |
| `chunks`         | PDF text pieces and embedding vectors used for retrieval | `bookId` points to a book                |
| `chats`          | Conversation messages                                    | One chat document per unique `sessionId` |

## Important implementation notes

- PDF uploads are buffered in memory by Multer; large uploads therefore consume server memory while being processed.
- The PDF controller stores the original filename in `fileKey`. The ImageKit helper exists separately and is not part of the current upload flow.
- Vector search requires a MongoDB Atlas Vector Search index named `ez-learningAI` on `chunks.embedding`. The code does not create this index.
- `pageNumber` is an optional chunk field, but the current PDF splitting flow does not assign page numbers.
- `sessionId` in chat requests is validated as a MongoDB ObjectId and used as the key for chat history. The chat route does not itself require an access-token middleware.
- The user controller currently hashes passwords with SHA-256. Although `bcryptjs` is listed as a dependency, this controller does not use it.
- The login access token expires after 10 minutes; tokens returned by the refresh endpoint expire after 15 minutes. Refresh tokens expire after seven days and are stored in the database as SHA-256 hashes.
