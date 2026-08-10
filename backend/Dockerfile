FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY . .
RUN go mod tidy && go mod download

RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates
WORKDIR /app

COPY --from=builder /app/main .
RUN mkdir -p /app/uploads/avatars

EXPOSE 8000
CMD ["./main"]
