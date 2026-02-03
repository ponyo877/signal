.PHONY: all build clean test update-libs dev install

all: build

# Install dependencies
install:
	npm install

# Build production
build: install
	npx tsc --noEmit
	npx esbuild src/main.ts --bundle --outfile=build/bundle.js --target=es2020 --format=iife
	npx tsx scripts/build.ts

# Clean build artifacts
clean:
	rm -rf build dist node_modules

# Run tests
test:
	npx vitest run

# Update external libraries (jsQR, qrcode-generator)
update-libs:
	node scripts/update-libs.js

# Development server with hot reload
dev: install
	npx tsx scripts/dev.ts
