# Prepare Application

Start the Angular dashboard and NestJS API for testing, review, or E2E workflows.

## Instructions

### 1. Check Dependencies
- Verify `node_modules/` exists. If not, run `npm install`.

### 2. Check if Already Running
- Run `lsof -i :4200` to check if the Angular dashboard is already running
- Run `lsof -i :3000` to check if the NestJS API is already running
- If both are already running, skip to step 4

### 3. Start Services
- Start the NestJS API: `npx nx serve api &`
- Start the Angular dashboard: `npx nx serve dashboard &`
- Wait for both services to be ready:
  - Dashboard should be accessible at `http://localhost:4200`
  - API should be accessible at `http://localhost:3000`

### 4. Verify Services
- Confirm the dashboard responds at `http://localhost:4200`
- Confirm the API responds at `http://localhost:3000`

## Report

Report which services are running and on which ports.
