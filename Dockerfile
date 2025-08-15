# ---------- Stage 1: Build Frontend ----------
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Backend ----------
FROM node:20 AS backend
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# Copy backend code
COPY backend/ ./

# Copy frontend build to backend's public folder
RUN mkdir -p /app/backend/public
COPY --from=frontend-builder /app/frontend/dist /app/backend/public

EXPOSE 5000
CMD ["node", "index.js"]
