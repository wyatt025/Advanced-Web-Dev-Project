# --- Stage 1: Build & Dependency Installation ---
FROM node:26-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package configuration files
COPY package*.json ./

# Install ALL dependencies (including devDependencies if needed for build steps)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run build step if your app requires compilation/bundling (e.g., TypeScript)
# RUN npm run build

# Prune devDependencies to keep the production image lean
RUN npm prune --production


# --- Stage 2: Final Production Runtime ---
FROM node:26-alpine AS runner

# Define environment variable
ENV NODE_ENV=production

# Set the working directory
WORKDIR /usr/src/app

# Copy only the necessary production artifacts from the builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/ . 

# Expose port 3001 to the outside world
EXPOSE 3001

# Use the built-in non-root 'node' user for security
USER node

# Command to run the application
CMD ["node", "app.js"]
