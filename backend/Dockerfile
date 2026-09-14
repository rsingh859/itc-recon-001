# Stage 1: Build Go Binary
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git and build dependencies
RUN apk add --no-cache git

# Cache dependencies
COPY go.mod go.sum* ./
RUN go mod download

# Copy backend source code
COPY . .

# Build target microservice or unified server (passed via build arg)
ARG SERVICE=server
ENV SERVICE_NAME=${SERVICE}

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/service ./cmd/${SERVICE_NAME}

# Stage 2: Minimal Runtime Image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app

# Copy compiled binary from builder
COPY --from=builder /app/bin/service /app/service

# Copy migrations in case embedded migrations or standalone scripts are referenced
COPY --from=builder /app/migrations /app/migrations

# Default to Port 8080 (can be overridden via environment variables)
ENV PORT=8080
EXPOSE ${PORT}

CMD ["/app/service"]
