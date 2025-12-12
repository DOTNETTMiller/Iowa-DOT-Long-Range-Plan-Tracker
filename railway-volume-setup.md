# Railway Volume Setup for Persistent Photo Storage

## Step 1: Create a Volume in Railway Dashboard

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Settings" tab
4. Scroll to "Volumes" section
5. Click "New Volume"
6. Set the mount path to: `/app/uploads`
7. Give it a name like "uploads-storage"
8. Save

## Step 2: Volume will persist across deployments

Once configured, all files in `/app/uploads` will be persisted even when Railway restarts.

## Alternative: Use Cloud Storage (S3/R2)

If you need better reliability and CDN features, consider using:
- AWS S3
- Cloudflare R2 (S3-compatible, free tier)
- Railway's built-in S3 integration

This requires code changes to upload directly to cloud storage instead of local filesystem.
