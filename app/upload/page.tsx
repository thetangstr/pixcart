import { Upload } from 'lucide-react'

export default function UploadPage() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full w-fit mx-auto mb-6">
          <Upload className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Upload Your Photo
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Transform your photos into beautiful oil paintings
        </p>
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            🚧 Under Construction
          </h2>
          <p className="text-gray-600">
            Our oil painting converter is currently being updated with new features. 
            Please check back soon!
          </p>
        </div>
      </div>
    </div>
  )
}