# FinPlanner - Financial Tracker Application

A full-stack financial tracking application built with React (frontend), Node.js/Express (backend), and PostgreSQL (database).

## Docker Deployment on Ubuntu

This guide will help you deploy the FinPlanner application using Docker and Docker Compose on an Ubuntu system.

### Prerequisites

Before deploying, ensure you have the following installed on your Ubuntu system:

1. **Docker** (version 20.10 or higher)
2. **Docker Compose** (version 1.29 or higher)

#### Installing Docker and Docker Compose on Ubuntu

If you don't have Docker installed, follow these steps:

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add your user to the docker group (optional, to run Docker without sudo)
sudo usermod -aG docker $USER
# Note: You'll need to log out and log back in for this to take effect
```

### Deployment Steps

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd FinPlanner
   ```

2. **Configure Environment Variables** (Optional):
   
   By default, the application uses the following configuration:
   - Database: PostgreSQL on port 5432
   - Database User: `postgres`
   - Database Password: `postgres`
   - Database Name: `financial_tracker`
   - Backend Port: `5000`
   - Frontend Port: `80`
   - JWT Secret: `change-this-secret-key-in-production` (⚠️ **Change this in production!**)

   To customize these settings, you can create a `.env` file in the project root, or modify the values in `docker-compose.yml` directly.

   **Important for Production**: Change the `JWT_SECRET` environment variable in `docker-compose.yml` to a secure random string.

3. **Build and Start the Services**:
   
   To build the Docker images and start all services (database, backend, and frontend):
   ```bash
   docker compose up -d
   ```
   
   The `-d` flag runs the containers in detached mode (in the background).
   
   **What this command does:**
   - Pulls the PostgreSQL image
   - Builds the backend and frontend Docker images
   - Creates and starts all three containers:
     - `financial-tracker-db` (PostgreSQL database)
     - `financial-tracker-backend` (Node.js API server)
     - `financial-tracker-frontend` (React app served by Nginx)
   - Sets up a persistent volume for database data
   - Runs database migrations automatically

4. **Verify the Services are Running**:
   ```bash
   docker compose ps
   ```
   
   You should see all three services with status "Up" or "running".

5. **Check Service Logs** (if needed):
   ```bash
   # View logs for all services
   docker compose logs
   
   # View logs for a specific service
   docker compose logs backend
   docker compose logs postgres
   docker compose logs frontend
   
   # Follow logs in real-time
   docker compose logs -f
   ```

### Starting Individual Services

While `docker compose up` starts all services together, you can also start them individually:

```bash
# Start only the database
docker compose up -d postgres

# Start the backend (requires database to be running)
docker compose up -d backend

# Start the frontend (requires backend to be running)
docker compose up -d frontend

# Start database and backend together
docker compose up -d postgres backend
```

### Stopping Services

```bash
# Stop all services (containers will be removed)
docker compose down

# Stop services but keep containers and volumes
docker compose stop

# Stop services and remove volumes (⚠️ This will delete database data)
docker compose down -v
```

### Restarting Services

```bash
# Restart all services
docker compose restart

# Restart a specific service
docker compose restart backend
docker compose restart postgres
docker compose restart frontend
```

### Accessing the Application

Once the services are running:

- **Frontend**: Open your web browser and navigate to `http://localhost` or `http://<your-server-ip>`
- **Backend API**: The API is available at `http://localhost:5000` or `http://<your-server-ip>:5000`
- **API Health Check**: Visit `http://localhost:5000/api/health` to verify the backend is running

### Database Access

If you need to access the PostgreSQL database directly:

```bash
# Connect to the database container
docker exec -it financial-tracker-db psql -U postgres -d financial_tracker

# Or run SQL commands directly
docker exec -it financial-tracker-db psql -U postgres -d financial_tracker -c "SELECT * FROM users;"
```

### Troubleshooting

**Services won't start:**
```bash
# Check if ports are already in use
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :5432
sudo netstat -tulpn | grep :80

# If ports are in use, stop the conflicting service or change ports in docker-compose.yml
```

**Database connection errors:**
- Ensure the postgres service is healthy before the backend starts
- Check database logs: `docker compose logs postgres`
- Verify environment variables in docker-compose.yml match database configuration

**Backend won't start:**
- Check backend logs: `docker compose logs backend`
- Ensure database migrations completed successfully
- Verify all environment variables are set correctly

**Frontend can't connect to backend:**
- Check that the backend service is running: `docker compose ps`
- Verify the REACT_APP_API_URL environment variable in docker-compose.yml
- Check browser console for CORS or connection errors

**Rebuild after code changes:**
```bash
# Rebuild images and restart services
docker compose up -d --build

# Rebuild a specific service
docker compose build backend
docker compose up -d backend
```

**View container resource usage:**
```bash
docker stats
```

### Production Considerations

For production deployments, consider:

1. **Change default credentials**: Update database passwords and JWT secrets in `docker-compose.yml`
2. **Use environment files**: Create a `.env` file and reference it in `docker-compose.yml` using `env_file`
3. **Set up reverse proxy**: Use Nginx or Traefik as a reverse proxy with SSL/TLS
4. **Enable HTTPS**: Configure SSL certificates for secure connections
5. **Database backups**: Set up regular backups of the PostgreSQL volume
6. **Log management**: Configure log rotation and centralized logging
7. **Resource limits**: Add resource limits to services in `docker-compose.yml`
8. **Network security**: Configure firewall rules to restrict access to ports

### Useful Commands

```bash
# View service status
docker compose ps

# View logs
docker compose logs -f

# Execute commands in a running container
docker exec -it financial-tracker-backend sh
docker exec -it financial-tracker-db psql -U postgres

# Remove all containers and volumes (⚠️ deletes data)
docker compose down -v

# Clean up Docker system (removes unused images, containers, networks)
docker system prune -a
```

---

For more information about Docker and Docker Compose, visit:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
