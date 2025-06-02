'use client'

import Link from 'next/link'
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
    return (
        <nav className="border-b bg-background">
            <div className="flex h-16 items-center px-4 md:px-6">
                {/* Logo/Brand */}
                <div className="flex items-center space-x-4">
                    <Link href="/" className="text-xl font-bold">
                        Cardz
                    </Link>
                </div>

                {/* Navigation items */}
                <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center space-x-6 ml-6">
                        <SignedIn>
                            <Link
                                href="/decks"
                                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                            >
                                Your Decks
                            </Link>
                        </SignedIn>
                        <SignedOut>
                            <Link
                                href="/sign-in"
                                className="text-sm font-medium text-foreground/60 transition-colors hover:text-foreground"
                            >
                                Your Decks
                            </Link>
                        </SignedOut>
                    </div>

                    {/* Auth buttons and theme toggle */}
                    <div className="flex items-center space-x-4">
                        <ThemeToggle />
                        <SignedOut>
                            <SignInButton mode="modal">
                                <Button variant="ghost" size="sm">
                                    Sign In
                                </Button>
                            </SignInButton>
                            <SignUpButton mode="modal">
                                <Button size="sm">
                                    Sign Up
                                </Button>
                            </SignUpButton>
                        </SignedOut>
                        <SignedIn>
                            <UserButton />
                        </SignedIn>
                    </div>
                </div>
            </div>
        </nav>
    )
} 