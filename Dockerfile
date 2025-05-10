# Stage 1: Base image with Node.js and pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Stage 2: Builder image - Install dependencies, ingest data, and build the app
FROM base AS builder

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
# This includes your 'docs/' directory (which has 'resume Abualya.pdf')
# and 'scripts/ingest-data.ts'
COPY . .

# IMPORTANT: Ensure your OPENAI_API_KEY is set as an environment variable
# in your Railway service settings. It's needed for the ingest script.
# Railway injects service environment variables into the build process.

# Run the ingestion script to create the 'data/' directory
# This script needs tsx, which should be in devDependencies.
# pnpm install (without --prod) installs devDependencies.
RUN pnpm run ingest

# Build the Next.js application
# The --mount syntax is for caching and should be supported by Railway's modern builders.
RUN --mount=type=cache,target=/app/.next/cache \
    --mount=type=cache,target=/app/node_modules/.cache \
    pnpm run build

# Stage 3: Production image - Copy only necessary files from the builder
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Copy necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# CRITICAL: Copy the generated 'data/' directory (vector store) from the builder stage
COPY --from=builder /app/data ./data

# Expose the port the app runs on (default for Next.js is 3000)
EXPOSE 3000

# Command to run the application
CMD ["pnpm", "start"]
