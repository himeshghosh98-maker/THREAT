FROM node:22-bookworm-slim
WORKDIR /chain
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY hardhat.config.ts tsconfig.json ./
COPY contracts contracts
COPY scripts scripts
COPY deployments deployments
RUN npx --no-install hardhat compile
EXPOSE 8545
CMD ["sh", "scripts/container-chain.sh"]
