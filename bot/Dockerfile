FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production
COPY src/ src/

EXPOSE 8080
CMD ["node", "--experimental-strip-types", "src/index.ts"]
