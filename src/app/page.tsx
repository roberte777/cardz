'use client';

import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-12 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Organize Your Magic Cards
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Build, manage, and track your Magic: The Gathering decks with ease.
              Create powerful collections and never lose track of your cards again.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg" className="text-lg px-8 py-4">
                  Get Started
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="text-lg px-8 py-4">
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/decks">
                <Button size="lg" className="text-lg px-8 py-4">
                  View Your Decks
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to help you manage your Magic card collection
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Deck Building</h3>
              <p className="text-muted-foreground">
                Create and organize multiple decks for different formats and strategies.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Card Search</h3>
              <p className="text-muted-foreground">
                Find any Magic card quickly with powerful search and filtering options.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto">
                <svg
                  className="w-6 h-6 text-primary-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Collection Tracking</h3>
              <p className="text-muted-foreground">
                Keep track of your entire collection and deck statistics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
