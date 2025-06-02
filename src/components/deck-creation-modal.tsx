'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardSearch } from '@/components/card-search'
import { Plus, Crown, X } from 'lucide-react'

const deckFormSchema = z.object({
    name: z.string().min(1, 'Deck name is required').max(100, 'Deck name must be less than 100 characters'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    format: z.enum(['Standard', 'Commander'], {
        required_error: 'Please select a format',
    }),
    commanderId: z.string().optional(),
})

type DeckFormValues = z.infer<typeof deckFormSchema>

interface DeckCreationModalProps {
    trigger?: React.ReactNode
}

interface Card {
    id: string
    name: string
    typeLine: string
    setName: string
}

export function DeckCreationModal({ trigger }: DeckCreationModalProps) {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCommander, setSelectedCommander] = useState<Card | null>(null)
    const { user } = useUser()
    const router = useRouter()

    const form = useForm<DeckFormValues>({
        resolver: zodResolver(deckFormSchema),
        defaultValues: {
            name: '',
            description: '',
            format: undefined,
            commanderId: '',
        },
    })

    const watchFormat = form.watch('format')

    const handleCommanderSelect = (card: Card) => {
        setSelectedCommander(card)
        form.setValue('commanderId', card.id)
    }

    const clearCommander = () => {
        setSelectedCommander(null)
        form.setValue('commanderId', '')
    }

    const onSubmit = async (values: DeckFormValues) => {
        if (!user) return

        setIsLoading(true)
        try {
            const response = await fetch('/api/decks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: values.name,
                    description: values.description || null,
                    format: values.format,
                    userId: user.id,
                    commanderId: values.commanderId || null,
                }),
            })

            if (response.ok) {
                const deck = await response.json()
                setOpen(false)
                form.reset()
                setSelectedCommander(null)
                router.push(`/decks/${deck.id}`)
            } else {
                throw new Error('Failed to create deck')
            }
        } catch (error) {
            console.error('Error creating deck:', error)
            // TODO: Add proper error handling/toast
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create New Deck
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Deck</DialogTitle>
                    <DialogDescription>
                        Choose your format and give your deck a name to get started.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Deck Name *</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter deck name..."
                                            {...field}
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="format"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Format *</FormLabel>
                                    <Select
                                        onValueChange={(value) => {
                                            field.onChange(value)
                                            // Clear commander when switching away from Commander format
                                            if (value !== 'Commander') {
                                                clearCommander()
                                            }
                                        }}
                                        defaultValue={field.value}
                                        disabled={isLoading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a format" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Standard">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                    Standard
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="Commander">
                                                <div className="flex items-center gap-2">
                                                    <Crown className="w-4 h-4 text-yellow-500" />
                                                    Commander
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {watchFormat === 'Commander' && (
                            <FormField
                                control={form.control}
                                name="commanderId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Commander</FormLabel>
                                        <FormControl>
                                            <div className="space-y-2">
                                                {selectedCommander ? (
                                                    <div className="flex items-center justify-between p-2 border rounded">
                                                        <div>
                                                            <div className="font-medium">{selectedCommander.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {selectedCommander.typeLine}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={clearCommander}
                                                            disabled={isLoading}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <CardSearch
                                                        placeholder="Search for your commander..."
                                                        onCardSelect={handleCommanderSelect}
                                                        filterBy="commander"
                                                        showAddButton={false}
                                                    />
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                        <p className="text-sm text-muted-foreground">
                                            You can add or change your commander later in the deck editor.
                                        </p>
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe your deck strategy..."
                                            className="resize-none"
                                            {...field}
                                            disabled={isLoading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end space-x-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Creating...' : 'Create Deck'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
} 