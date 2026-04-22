FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates

# Install and verify yt-dlp
RUN pip3 install --upgrade pip && \
    pip3 install yt-dlp && \
    ln -s /usr/local/bin/yt-dlp /usr/bin/yt-dlp && \
    which yt-dlp && \
    yt-dlp --version

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy app code
COPY . .

# Create downloads directory with write permissions
RUN mkdir -p downloads && chmod 777 downloads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["npm", "start"]
