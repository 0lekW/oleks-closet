# Oleks Closet

A web application for managing your clothing items and creating outfit combinations with background removal, visual outfit builder, and export functionality.

https://hub.docker.com/repository/docker/0iek/oleks-closet/general

## Features

- **Upload & Process** - Upload clothing photos with automatic background removal
- **Organize** - Tag and categorize items (tops, bottoms, shoes, accessories, etc.)
- **Outfit Builder** - Drag and drop items to create outfit combinations
- **Randomize** - Generate random outfit combinations
- **Export** - Save outfit compositions as images
- **Search & Filter** - Find items by name or category

## Quick Start

### Prerequisites

- Python 3.11+ (for local development)
- Docker (for containerized deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/0lekW/oleks-closet
   cd oleks-closet
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python run.py
   ```

5. **Open browser**
   Navigate to `http://localhost:8762`

## Docker Deployment

### Option 1: Using docker-compose (Recommended)

1. **Example compose.yml**
   ```yaml
   services:
   oleks-closet:
      build: .
      container_name: oleks-closet
      ports:
         - "8762:8762"
      volumes:
         - ./data:/app/data
         - ./app/static/uploads:/app/app/static/uploads
      environment:
         - SECRET_KEY=your-secret-key-for-homelab (this is not really important for local hosting)
         - SQLALCHEMY_DATABASE_URI=sqlite:////app/data/closet.db
      restart: unless-stopped
   ```

2. **Build and run**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop**
   ```bash
   docker-compose down
   ```

### Option 2: Plain Docker Commands

1. **Build image**
   ```bash
   docker build -t oleks-closet .
   ```

2. **Run container**
   
   **Windows (CMD):**
   ```bash
   docker run -d -p 8762:8762 ^
     --name oleks-closet ^
     -v "%cd%/data:/app/data" ^
     -v "%cd%/app/static/uploads:/app/app/static/uploads" ^
     --restart unless-stopped ^
     oleks-closet
   ```
   
   **Linux/Mac:**
   ```bash
   docker run -d -p 8762:8762 \
     --name oleks-closet \
     -v "$(pwd)/data:/app/data" \
     -v "$(pwd)/app/static/uploads:/app/app/static/uploads" \
     --restart unless-stopped \
     oleks-closet
   ```

3. **Manage container**
   ```bash
   docker stop oleks-closet    # Stop
   docker start oleks-closet   # Start
   docker restart oleks-closet # Restart
   docker logs -f oleks-closet # View logs
   docker rm oleks-closet      # Remove container
   ```

### Option 3: NixOS Deployment

For NixOS homelab deployments:

```nix
oleks-closet = {
  image = "oleks-closet:latest";
  ports = [ "8762:8762" ];
  volumes = [
    "/var/lib/oleks-closet/data:/app/data"
    "/var/lib/oleks-closet/uploads:/app/app/static/uploads"
  ];
  autoStart = true;
  extraOptions = [ "--network=homelab" ];
};
```

## Configuration

### Port Configuration

**Default port:** 8762

**Change port:**
- **docker-compose:** Edit `ports` in `docker-compose.yml` (e.g., `"9000:8762"`)
- **docker run:** Change `-p` flag (e.g., `-p 9000:8762`)

### Volume Paths

The application uses two persistent volumes:

| Volume | Purpose | Container Path |
|--------|---------|----------------|
| Database | SQLite database with all item metadata | `/app/data` |
| Uploads | Original, processed, and thumbnail images | `/app/app/static/uploads` |

**Custom volume paths:**
```bash
docker run -d -p 8762:8762 \
  -v /your/custom/path/data:/app/data \
  -v /your/custom/path/uploads:/app/app/static/uploads \
  oleks-closet
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret-key-for-homelab` | Flask session secret key |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:////app/data/closet.db` | Database connection string |

## Project Structure

```
oleks-closet/
├── app/
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   ├── static/          # CSS, JS, images
│   │   ├── css/
│   │   ├── js/
│   │   ├── images/
│   │   └── uploads/     # User uploaded images (persistent)
│   ├── templates/       # HTML templates
│   └── utils/           # Image processing utilities
├── data/                # Database storage (persistent)
├── config.py            # Application configuration
├── run.py               # Application entry point
├── requirements.txt     # Python dependencies
├── Dockerfile           # Docker image definition
```

## Dependencies

### Python Packages
- **Flask** - Web framework
- **Flask-SQLAlchemy** - Database ORM
- **Pillow** - Image processing
- **rembg** - AI-powered background removal
- **html2canvas** (CDN) - Screenshot export

### System Libraries (Docker)
- `libgl1` - OpenGL support
- `libglib2.0-0` - Core graphics library

## Troubleshooting

### Background removal not working
- Ensure rembg model downloads on first use (~170MB), might take a moment
- Check internet connection for initial model download
- Verify sufficient disk space

### Images not persisting after restart
- Ensure volume mounts are configured correctly
- Check that host directories exist and have write permissions
- Verify volumes in `docker ps -a` output

### Port already in use
- Change the host port mapping: `-p 9000:8762`
- Or stop the conflicting service

### Database Migrations

To reset the database:
```bash
# Local
rm closet.db
python run.py

# Docker
docker-compose down (or however you need to stop service)
rm -rf data/
docker-compose up -d
```

### Dev TODO list:
- Replace SVG
- Save outfits in database
- Auto categorise items
- Non random outfit generation
- Allow multiple photos for a single item
  
Builder panel rebuild:
- Clear all in builder panel
- Mobile re-tap to remove items
- Tap to add/remove for web version + icon for preview (replacing tap)
- Remove permanent X on web (mobile only)
- Better builder panel layout in general
