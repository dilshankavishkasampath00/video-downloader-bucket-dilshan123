FROM node:18-alpine

# Install system dependencies and yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    && pip3 install --upgrade pip \
    && pip3 install yt-dlp \
    && which yt-dlp

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
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["npm", "start"]
