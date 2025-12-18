# Build Stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the application
RUN go build -o backend main.go

# Run Stage
FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/backend .
EXPOSE 3000
CMD ["./backend"]
