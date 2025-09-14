'use client';

import React, { useState } from 'react';
import orangeLogo from '/public/images/orange-logo-icon.png'; // if alias is set up

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const LOGO_URL = '/images/orange-logo-icon.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email);
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md flex flex-col items-center">
        <Image
          src={orangeLogo}
          alt="Clodura.AI Logo"
          width={50}
          height={50}
          className="mb-4"
          loading="lazy"
          unoptimized
        />
        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col items-center"
        >
          <h2 className="mb-3 text-center text-l font-semibold">
            Log In to Clodura.AI
          </h2>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mb-3 w-[300px] px-4 py-2 border border-gray-300 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-orange-500 text-start"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="w-[300px] py-2 mb-2 cursor-pointer rounded-[12px] bg-gray-700 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Continue'
            )}
          </button>
          <p className="text-xs mt-2">
            Not a Member yet?{' '}
            <Link
              href="/auth/register"
              className="text-blue-600 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}