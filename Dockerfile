FROM node:22-alpine AS frontend

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM golang:1.25-bookworm AS backend

WORKDIR /src
ENV GOTOOLCHAIN=auto
ENV CGO_ENABLED=0

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN go build -o /out/api ./cmd/api

FROM alpine:3.21

WORKDIR /app
RUN mkdir -p /data /data/avatars

COPY --from=backend /out/api /app/api
COPY --from=frontend /app/dist /app/web

ENV PORT=8080
ENV DATABASE_PATH=/data/bprime.db
ENV STATIC_DIR=/app/web

EXPOSE 8080

ENTRYPOINT ["/app/api"]
