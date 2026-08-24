#!/bin/bash

# Stop all running development services

echo "Stopping services..."

# Kill Nx serve processes
pkill -f "nx serve" 2>/dev/null

# Kill processes on dev ports (4200=dashboard, 3000=api)
lsof -ti:4200,3000 | xargs kill -9 2>/dev/null

echo "Services stopped."
