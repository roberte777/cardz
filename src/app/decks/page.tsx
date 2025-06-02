'use client'

import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function DecksPage() {
    const { user, isLoaded } = useUser()

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Your Decks</h1>
                    <p className="text-muted-foreground mt-2">
                        Welcome back, {user?.firstName || user?.username || 'Planeswalker'}!
                        Manage your Magic deck collection here.
                    </p>
                </div>
                <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create New Deck
                </Button>
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                    <svg
                        className="w-12 h-12 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-2">No decks yet</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                    Ready to start building? Create your first deck and begin organizing your Magic collection.
                </p>
                <Button size="lg" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Your First Deck
                </Button>
            </div>

            {/* Future: Deck Grid will go here when we have actual decks */}
        </div>
    )
} 