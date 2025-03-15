'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Fallback image URL in case Replicate image fails to load
const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80";

export default function PreviewPage() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [replicateImage, setReplicateImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [isReplicateLoading, setIsReplicateLoading] = useState(false);
  const [replicateImageError, setReplicateImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Function to retry loading the Replicate image
  const retryReplicateImage = async () => {
    if (retryCount >= 3) {
      console.log('Max retry attempts reached, using fallback image');
      setReplicateImage(FALLBACK_IMAGE_URL);
      setApiErrorMessage(prev => `${prev || ''} Max retry attempts reached, using fallback image.`);
      return;
    }

    setRetryCount(prev => prev + 1);
    setReplicateImageError(false);
    setIsReplicateLoading(true);
    
    try {
      // Try to regenerate the image via API
      const originalUrl = sessionStorage.getItem('originalImageUrl');
      if (originalUrl) {
        console.log(`Retry attempt ${retryCount + 1}: Regenerating image via API`);
        
        const response = await fetch('/api/generate-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            imageUrl: originalUrl,
            retry: true,
            retryCount: retryCount + 1
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.replicateImageUrl) {
            console.log('Successfully regenerated image:', data.replicateImageUrl);
            setReplicateImage(data.replicateImageUrl);
            
            // Pre-load the image to verify it works
            const img = new Image();
            img.onload = () => {
              console.log('Regenerated image loaded successfully');
              setIsReplicateLoading(false);
            };
            img.onerror = () => {
              console.error('Regenerated image failed to load');
              setReplicateImageError(true);
              setIsReplicateLoading(false);
              setReplicateImage(FALLBACK_IMAGE_URL);
            };
            img.src = data.replicateImageUrl;
          } else {
            throw new Error('No image URL in response');
          }
        } else {
          throw new Error('Failed to regenerate image');
        }
      } else {
        throw new Error('No original image URL available');
      }
    } catch (err) {
      console.error('Error retrying image generation:', err);
      setReplicateImageError(true);
      setIsReplicateLoading(false);
      setReplicateImage(FALLBACK_IMAGE_URL);
      setApiErrorMessage(prev => `${prev || ''} Failed to regenerate image after retry.`);
    }
  };

  useEffect(() => {
    // Get the image URLs from session storage
    const originalUrl = sessionStorage.getItem('originalImageUrl');
    const replicateUrl = sessionStorage.getItem('replicateImageUrl');
    const filterData = sessionStorage.getItem('filterData');

    console.log('Retrieved from session storage:', {
      originalUrl,
      replicateUrl,
      filterData
    });

    if (originalUrl) {
      try {
        // Validate URL
        new URL(originalUrl);
        console.log('URL is valid');
        
        // Get the current port from window.location
        const currentPort = window.location.port;
        console.log('Current port:', currentPort);
        
        // Fix port in original URL to match current port
        let fixedOriginalUrl = originalUrl;
        const originalUrlObj = new URL(originalUrl);
        if (originalUrlObj.port && originalUrlObj.port !== currentPort) {
          originalUrlObj.port = currentPort;
          fixedOriginalUrl = originalUrlObj.toString();
          console.log('Fixed original URL port:', fixedOriginalUrl);
        }
        
        setOriginalImage(fixedOriginalUrl);
        
        // Set Replicate image if available
        if (replicateUrl) {
          // Pre-load the image to verify it works
          const img = new Image();
          img.onload = () => {
            console.log('Replicate image loaded successfully');
            setReplicateImage(replicateUrl);
          };
          img.onerror = () => {
            console.error('Replicate image failed to load, will retry or use fallback');
            setReplicateImageError(true);
            // Try to use a fallback or retry
            if (replicateUrl.includes('[object Object]') || 
                replicateUrl.includes('ReadableStream') ||
                !replicateUrl.startsWith('http')) {
              console.log('Invalid Replicate image URL, using fallback');
              setReplicateImage(FALLBACK_IMAGE_URL);
            } else {
              // Will trigger retry in another useEffect
              setReplicateImage(null);
            }
          };
          img.src = replicateUrl;
          console.log('Attempting to load Replicate image URL:', replicateUrl);
        } else {
          console.log('No Replicate image URL available, using fallback');
          setReplicateImage(FALLBACK_IMAGE_URL);
        }
        
        // Check if we have error message
        if (filterData) {
          try {
            const filterInfo = JSON.parse(filterData);
            if (filterInfo.errorMessage) {
              setApiErrorMessage(filterInfo.errorMessage);
              console.log('API error message:', filterInfo.errorMessage);
            }
          } catch (e) {
            console.error('Error parsing filter data:', e);
          }
        }
        
      } catch (err) {
        console.error('Invalid URL:', err);
        setError('Invalid image URL. Please try uploading again.');
      }
    } else {
      console.error('Missing URL in session storage');
      setError('No image found. Please upload an image first.');
    }
    setIsLoading(false);
  }, []);

  // Effect to handle retrying when Replicate image fails to load
  useEffect(() => {
    if (replicateImageError && retryCount < 3 && !isReplicateLoading) {
      console.log('Replicate image failed to load, attempting retry');
      retryReplicateImage();
    }
  }, [replicateImageError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link
            href="/upload"
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Upload Image
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Your AI-Generated Preview
          </h1>
          <p className="text-gray-600">
            See how your photo would look as an oil painting
          </p>
          {apiErrorMessage && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded-md">
              <p className="text-yellow-800 text-sm">{apiErrorMessage}</p>
              <p className="text-xs text-yellow-700 mt-1">Don't worry! We're still showing you a preview using client-side effects.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* CSS Oil Painting Effect */}
          <div className="bg-white rounded-lg shadow-lg p-6" style={{ transform: 'scale(1.045)', margin: '1.25rem auto', zIndex: 1 }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                CSS Oil Painting
              </h2>
              {originalImage && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                >
                  {showOriginal ? "Show Effect" : "Show Original"}
                </button>
              )}
            </div>
            <div className="relative aspect-square">
              {originalImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={originalImage}
                    alt={showOriginal ? "Original photo" : "CSS-generated oil painting"}
                    className={`w-full h-full object-cover rounded-lg ${!showOriginal ? 'oil-painting-base' : ''}`}
                    style={!showOriginal ? {
                      filter: 'saturate(3.5) contrast(2.2) brightness(1.3) blur(1.5px) sepia(0.6)',
                    } : {}}
                  />
                  {!showOriginal && (
                    <>
                      {/* Mosaic overlay */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100%25\' height=\'100%25\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'smallGrid\' width=\'8\' height=\'8\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 8 0 L 0 0 0 8\' fill=\'none\' stroke=\'rgba(0, 0, 0, 0.6)\' stroke-width=\'1.5\'/%3E%3C/pattern%3E%3Cpattern id=\'grid\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Crect width=\'40\' height=\'40\' fill=\'url(%23smallGrid)\'/%3E%3Cpath d=\'M 40 0 L 0 0 0 40\' fill=\'none\' stroke=\'rgba(0, 0, 0, 0.7)\' stroke-width=\'2.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grid)\' /%3E%3C/svg%3E")',
                          mixBlendMode: 'overlay',
                          opacity: 0.95
                        }}
                      />
                      
                      {/* Color overlay */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          background: 'radial-gradient(circle, rgba(255,180,120,0.6) 0%, rgba(255,100,50,0.8) 100%)',
                          mixBlendMode: 'overlay',
                        }}
                      />
                      
                      {/* Vignette */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          boxShadow: 'inset 0 0 120px 30px rgba(0,0,0,0.8)',
                        }}
                      />
                      
                      {/* Brush strokes */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 3px, transparent 3px, transparent 10px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 4px, transparent 4px, transparent 12px)',
                          mixBlendMode: 'overlay',
                        }}
                      />
                      
                      {/* Canvas texture */}
                      <div 
                        className="absolute inset-0 rounded-lg pointer-events-none"
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.3\'/%3E%3C/svg%3E")',
                          opacity: 0.7,
                          mixBlendMode: 'multiply',
                        }}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                  <p className="text-gray-500">No preview image available</p>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Client-side CSS effects</strong> applied directly in your browser.
              </p>
            </div>
          </div>

          {/* Replicate Stable Diffusion */}
          <div className="bg-white rounded-lg shadow-lg p-6" style={{ transform: 'scale(1.045)', margin: '1.25rem auto', zIndex: 1 }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Stable Diffusion
              </h2>
              {replicateImageError && (
                <button
                  onClick={retryReplicateImage}
                  disabled={isReplicateLoading || retryCount >= 3}
                  className={`px-4 py-2 text-white rounded-lg text-sm ${
                    isReplicateLoading || retryCount >= 3 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isReplicateLoading ? 'Retrying...' : 'Retry'}
                </button>
              )}
            </div>
            <div className="relative aspect-square">
              {isReplicateLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 rounded-lg">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-blue-600">Processing with AI...</p>
                  {retryCount > 0 && (
                    <p className="text-sm text-blue-400 mt-2">Retry attempt {retryCount}/3</p>
                  )}
                </div>
              ) : replicateImage ? (
                <img
                  src={replicateImage}
                  alt="Stable Diffusion generated oil painting"
                  className="w-full h-full object-cover rounded-lg"
                  onError={() => {
                    console.error('Replicate image failed to load:', replicateImage);
                    setReplicateImageError(true);
                    setApiErrorMessage(prev => prev ? `${prev}. Also failed to load Replicate image.` : 'Failed to load Replicate image.');
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center p-4">
                    <p className="text-gray-500 mb-2">No AI-generated image available</p>
                    {apiErrorMessage && (
                      <p className="text-xs text-red-500">{apiErrorMessage}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Stable Diffusion XL</strong> - AI-generated oil painting style using Replicate API.
              </p>
              {replicateImageError && (
                <p className="text-xs text-red-500 mt-1">
                  {retryCount >= 3 
                    ? 'Max retry attempts reached. Using fallback image.' 
                    : 'Image failed to load. Click retry to try again.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/upload"
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600 transition-colors mr-4"
          >
            Upload Another Photo
          </Link>
          <Link
            href="/order"
            className="inline-block bg-green-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-600 transition-colors"
          >
            Order Your Painting
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .oil-painting-base {
          image-rendering: pixelated;
          transform: scale(1.001); /* Force a repaint */
        }
      `}</style>
    </div>
  );
} 