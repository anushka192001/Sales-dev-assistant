# Use a lightweight Python base image
FROM python:3.10.16-slim


# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy the entire app source
COPY . .

# Expose the Flask port
EXPOSE 8000

# Run the Flask app
CMD ["python", "routes.py"]
