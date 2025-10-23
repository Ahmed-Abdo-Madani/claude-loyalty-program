# Use Node.js 20 on Debian Bullseye for better font support
FROM node:20-bullseye

# Install system dependencies for emoji rendering
RUN apt-get update && \
    apt-get install -y \
    fonts-noto-color-emoji \
    fontconfig \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Copy custom fontconfig to map Noto Emoji to Noto Color Emoji
COPY fonts/fonts.conf /etc/fonts/conf.d/99-emoji.conf

# Rebuild font cache with custom config
RUN fc-cache -fv

# Set environment variables
ENV NODE_ENV=production
ENV FONTCONFIG_PATH=/etc/fonts

# Create app directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (use ci for faster, more reliable installs)
RUN npm ci --only=production

# Copy application code
COPY . .

# Create directories and set ownership for node user
RUN mkdir -p logs _tmp_pkpass && \
    chown -R node:node /app

# Use non-root user for security
USER node

# Expose port (configurable via environment variable)
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
