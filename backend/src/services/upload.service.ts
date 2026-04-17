import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Optional: Configure in .env (CLOUDINARY_URL) or explicitly:
// cloudinary.config({ cloud_name: '...', api_key: '...', api_secret: '...' });

export function uploadToCloudinary(fileBuffer: Buffer, folder: string = 'fika'): Promise<string> {
  return new Promise((resolve, reject) => {
    // If CLOUDINARY_URL is missing, return a dummy URL for local dev without crashing
    if (!process.env.CLOUDINARY_URL) {
      console.warn('⚠️ CLOUDINARY_URL missing. Using dummy image URL.');
      return resolve('https://via.placeholder.com/800x600.png?text=No+Cloudinary+Config');
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        if (result) return resolve(result.secure_url);
        reject(new Error('Unknown Cloudinary upload error'));
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
}
