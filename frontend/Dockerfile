# DEVELOPMENT-ONLY image for compose.yaml. vinext dev is not production serving.
# Production target must be configured and validated separately (see docs/operations/PRODUCTION_READINESS.md).
FROM node:22-alpine
LABEL org.opencontainers.image.description="KIDSFIT CRM local development frontend only"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
