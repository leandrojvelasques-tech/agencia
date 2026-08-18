FROM node:20-alpine AS build
WORKDIR /app
COPY eventos-app/package.json eventos-app/package-lock.json ./eventos-app/
RUN cd eventos-app && npm install --no-audit --no-fund
COPY . .
RUN cd eventos-app && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "server.js"]
