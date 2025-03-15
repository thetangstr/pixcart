import Link from 'next/link';

export default function ThankYouPage() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 48 48"
          >
            <circle
              className="opacity-25"
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
              d="M14 24l8 8 16-16"
            />
          </svg>
        </div>

        <h1 className="text-4xl font-bold mb-4">Thank You for Your Order!</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Your order has been received and our artists will begin working on your masterpiece soon.
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">What Happens Next?</h2>
          <ol className="text-left space-y-4 text-gray-600 dark:text-gray-300">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3">
                1
              </span>
              <span>Our artists will review your photo and begin creating your custom painting</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3">
                2
              </span>
              <span>You'll receive progress updates via email throughout the process</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mr-3">
                3
              </span>
              <span>Once complete, we'll carefully package and ship your painting to you</span>
            </li>
          </ol>
        </div>

        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            We've sent a confirmation email with your order details.
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            Order number: <span className="font-mono font-medium">#2024{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}</span>
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 