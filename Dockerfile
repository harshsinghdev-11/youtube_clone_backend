# Use a small Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json & package-lock.json first for caching
COPY package*.json ./

# Install production deps
RUN npm install --production

# Copy rest of the project
COPY . .

# Expose port your app listens on
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
