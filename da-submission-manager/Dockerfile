FROM node:22-bullseye

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    libgbm1 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

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
