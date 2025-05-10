# Stage 1: Base image with Node.js and pnpm
# Using a specific Node.js LTS version on Alpine for smaller images
FROM node:18-alpine AS base

# Enable pnpm via corepack
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Optional: Check pnpm version
# RUN pnpm --version


# Stage 2: Builder stage
# This stage installs dependencies, ingests data, and builds the application
FROM base AS builder
WORKDIR /app

# Copy package.json and pnpm-lock.yaml first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install ALL dependencies (including devDependencies needed for 'ingest' script)
# Use --frozen-lockfile for reproducible builds
# Railway injects service environment variables (like OPENAI_API_KEY) here if needed by postinstall scripts,
# but typically OPENAI_API_KEY is needed for the 'ingest' script itself.
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
# This includes your 'docs/' directory (source for ingestion),
# 'scripts/ingest-data.ts', and other source files.
COPY . .

# IMPORTANT: Ensure your OPENAI_API_KEY is set as an environment variable
# in your Railway service settings. It's needed for the 'ingest' script.
# Railway injects service environment variables into the build process.
RUN pnpm run ingest

# Build the Next.js application
# FIX: Added id=... to each cache mount
RUN --mount=type=cache,id=nextjs_cache,target=/app/.next/cache \
    --mount=type=cache,id=nodemodules_tool_cache,target=/app/node_modules/.cache \
    pnpm run build

# Optional: If you want to prune devDependencies before copying to the runner stage
# RUN pnpm prune --prod


# Stage 3: Production image
# This stage takes the built application and necessary files for running it
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Railway will set the PORT environment variable. Next.js listens on 3000 by default if PORT isn't set.

# Copy necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml # Good practice

# Copy production node_modules
# If you ran 'pnpm prune --prod' in the builder stage, this will be smaller.
# Otherwise, it copies all node_modules.
COPY --from=builder /app/node_modules ./node_modules

# CRITICAL: Copy the generated 'data/' directory (vector store) from the builder stage
COPY --from=builder /app/data ./data

# Expose the port the app runs on (default for Next.js is 3000)
EXPOSE 3000

# Command to run the application
# pnpm start should execute 'next start' as defined in your package.json scripts
CMD ["pnpm", "start"]
