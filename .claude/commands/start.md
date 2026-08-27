# Start Application

Start the Angular dashboard and NestJS API for local development.

## Variables

PORT: $1 if provided, otherwise use default ports (4200 for dashboard, 3000 for API)

## Instructions

1. Check if the application is already running:
   - Run `lsof -i :4200` to check if the dashboard is already running
   - Run `lsof -i :3000` to check if the API is already running
   - If both are already running, report that and skip starting

2. If not already running, start the application:
   - Run `npx nx serve dashboard & npx nx serve api` to start both services

3. Wait for the services to be ready and confirm they are accessible.

## Report

Report which services were started and on which ports.
