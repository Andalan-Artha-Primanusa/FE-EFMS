# syntax=docker/dockerfile:1.7

FROM golang:1.25-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/financeerp-api ./cmd/api

FROM alpine:3.20

RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /out/financeerp-api /app/financeerp-api
RUN mkdir -p /app/uploads && chown -R app:app /app

USER app
EXPOSE 8080
ENV APP_ADDR=:8080
CMD ["/app/financeerp-api"]
