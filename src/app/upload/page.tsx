'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an image to upload');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload the image
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const uploadData = await uploadResponse.json();

      if (uploadData.imageUrl) {
        // Store the original image URL in session storage
        sessionStorage.setItem('originalImageUrl', uploadData.imageUrl);
        console.log('Stored original image URL:', uploadData.imageUrl);

        // Generate the preview
        const previewResponse = await fetch('/api/generate-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: uploadData.imageUrl }),
        });

        if (!previewResponse.ok) {
          const errorData = await previewResponse.json();
          throw new Error(errorData.error || 'Failed to generate preview');
        }

        const previewData = await previewResponse.json();

        // Store the preview data in session storage
        if (previewData.replicateImageUrl) {
          sessionStorage.setItem('replicateImageUrl', previewData.replicateImageUrl);
          console.log('Stored Replicate image URL:', previewData.replicateImageUrl);
        } else {
          sessionStorage.removeItem('replicateImageUrl');
          console.log('No Replicate image URL available');
        }

        if (previewData.filterData) {
          sessionStorage.setItem('filterData', previewData.filterData);
          console.log('Stored filter data');
        }

        // Navigate to the preview page
        router.push('/preview');
      } else {
        throw new Error('No image URL returned from upload');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An error occurred during upload');
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Upload Your Photo
          </h1>
          <p className="text-gray-600">
            Upload a photo to see how it would look as an oil painting
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="border-2 border-dashed rounded-lg p-12 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Select Image
            </label>
            <p className="mt-2 text-sm text-gray-500">
              JPEG, PNG, WebP up to 10MB
            </p>
          </div>

          {file && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {file.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !file || isUploading
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Upload and Preview'}
            </button>
          </div>

          {isUploading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-blue-600">Processing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 