FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@9.12.0

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install

# Copy source code
COPY apps/api/ ./apps/api/

# Build the API
RUN pnpm --filter @dasub/api build

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "--filter", "@dasub/api", "start"]
