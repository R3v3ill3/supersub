FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@9.12.0

# Set working directory
WORKDIR /app

# Copy the entire monorepo structure
COPY . .

# Change to the da-submission-manager directory
WORKDIR /app/da-submission-manager

# Install dependencies
RUN pnpm install

# Build the API
RUN pnpm --filter @dasub/api build

# Expose port
EXPOSE 3001

# Start the application
CMD ["pnpm", "--filter", "@dasub/api", "start"]
