FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV PORT=80

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

EXPOSE 80

CMD ["node", "server.js"]
