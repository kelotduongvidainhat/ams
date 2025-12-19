# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the application
RUN go build -o backend main.go

# Run Stage
FROM debian:bullseye-slim

# Install dependencies for Wallet Service
RUN apt-get update && apt-get install -y curl bash ca-certificates && rm -rf /var/lib/apt/lists/*

# Install fabric-ca-client
RUN curl -sSL https://github.com/hyperledger/fabric-ca/releases/download/v1.5.12/hyperledger-fabric-ca-linux-amd64-1.5.12.tar.gz | tar xz -C /usr/local

WORKDIR /app
COPY --from=builder /app/backend .
EXPOSE 3000
CMD ["./backend"]
