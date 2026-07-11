FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Generate mission manifest during image build
# This scans the missions/missions directory and creates manifest.json
RUN node scripts/generate-manifest.js || echo "Using existing manifest"

# Create necessary directories
RUN mkdir -p public/uploads

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]