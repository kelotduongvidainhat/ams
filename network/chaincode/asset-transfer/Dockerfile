FROM golang:1.20-alpine AS build

WORKDIR /go/src/github.com/asset-transfer-basic
COPY . .

# Build the binary
# Disable CGO for static linking
RUN CGO_ENABLED=0 go build -o chaincode-server -v .

FROM alpine:latest

WORKDIR /app
COPY --from=build /go/src/github.com/asset-transfer-basic/chaincode-server /app/chaincode-server

# Expose port for the chaincode server
EXPOSE 9999

# Start command will be overridden or set by default
CMD ["/app/chaincode-server"]
