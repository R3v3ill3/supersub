import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string>('');
  const [showDefaultCredentials, setShowDefaultCredentials] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    const result = await login(formData.email, formData.password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            DA Submission Manager
          </h1>
          <p className="text-gray-600 text-sm">
            Admin Interface
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mx-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Welcome back
            </h2>
            <p className="text-gray-600 text-sm text-center">
              Please sign in to your account
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Development Credentials */}
            <div className="pt-4 border-t border-gray-200 text-center">
              <button
                type="button"
                onClick={() => setShowDefaultCredentials(!showDefaultCredentials)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                {showDefaultCredentials ? 'Hide' : 'Show'} development credentials
              </button>
              
              {showDefaultCredentials && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
                  <p className="text-xs text-amber-800 font-medium mb-1">Development Environment</p>
                  <p className="text-xs text-amber-700">
                    Email: <code className="bg-amber-100 px-1 rounded">admin@localhost</code>
                  </p>
                  <p className="text-xs text-amber-700">
                    Password: <code className="bg-amber-100 px-1 rounded">admin123</code>
                  </p>
                  <p className="text-xs text-red-600 font-medium mt-2">
                    ⚠️ Change password after first login!
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2024 DA Submission Manager. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
