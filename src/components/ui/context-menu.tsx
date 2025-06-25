import * as React from "react"
import { cn } from "@/lib/utils"

interface ContextMenuProps {
    children: React.ReactNode
    items: ContextMenuItem[]
    onClose: () => void
}

export interface ContextMenuItem {
    label: string
    onClick: () => void
    disabled?: boolean
    icon?: React.ReactNode
    className?: string
}

interface ContextMenuContextType {
    isOpen: boolean
    position: { x: number; y: number }
    items: ContextMenuItem[]
    openMenu: (event: React.MouseEvent, items: ContextMenuItem[]) => void
    closeMenu: () => void
}

const ContextMenuContext = React.createContext<ContextMenuContextType | null>(null)

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [position, setPosition] = React.useState({ x: 0, y: 0 })
    const [items, setItems] = React.useState<ContextMenuItem[]>([])

    const openMenu = React.useCallback((event: React.MouseEvent, menuItems: ContextMenuItem[]) => {
        event.preventDefault()
        setPosition({ x: event.clientX, y: event.clientY })
        setItems(menuItems)
        setIsOpen(true)
    }, [])

    const closeMenu = React.useCallback(() => {
        setIsOpen(false)
        setItems([])
    }, [])

    React.useEffect(() => {
        const handleClick = () => closeMenu()
        const handleScroll = () => closeMenu()
        const handleResize = () => closeMenu()

        if (isOpen) {
            document.addEventListener('click', handleClick)
            document.addEventListener('scroll', handleScroll)
            window.addEventListener('resize', handleResize)
        }

        return () => {
            document.removeEventListener('click', handleClick)
            document.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleResize)
        }
    }, [isOpen, closeMenu])

    return (
        <ContextMenuContext.Provider value={{ isOpen, position, items, openMenu, closeMenu }}>
            {children}
            {isOpen && (
                <div
                    className="fixed z-50 min-w-[200px] bg-background border rounded-md shadow-lg py-1"
                    style={{
                        left: position.x,
                        top: position.y,
                    }}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                item.onClick()
                                closeMenu()
                            }}
                            disabled={item.disabled}
                            className={cn(
                                "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                item.className
                            )}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </ContextMenuContext.Provider>
    )
}

export function useContextMenu() {
    const context = React.useContext(ContextMenuContext)
    if (!context) {
        throw new Error('useContextMenu must be used within a ContextMenuProvider')
    }
    return context
} 