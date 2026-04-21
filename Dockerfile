FROM node:18-alpine

# Install yt-dlp and FFmpeg
RUN apk add --no-cache python3 py3-pip ffmpeg \
    && pip3 install yt-dlp

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy app code
COPY . .

# Expose port
EXPOSE 3000

# Create downloads directory with write permissions
RUN mkdir -p downloads
RUN chmod 777 downloads

# Start app
CMD ["npm", "start"]
