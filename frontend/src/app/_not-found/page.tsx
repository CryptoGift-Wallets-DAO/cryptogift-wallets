import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      <div className="max-w-md w-full px-6 py-8">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</h1>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
            Page Not Found
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="mt-8">
            <Link 
              href="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go back home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}