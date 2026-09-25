import { create } from 'zustand'
import type { Product } from '@/types/product.types'

export interface CartItem {
  product: Product
  quantity: number
  selectedBatchId?: string
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotalAmount: () => number
  getTotalItemsCount: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (product: Product, quantity: number = 1) => {
    const currentItems = get().items
    const existingIndex = currentItems.findIndex(i => i.product.id === product.id)

    if (existingIndex > -1) {
      const updated = [...currentItems]
      updated[existingIndex].quantity += quantity
      set({ items: updated })
    } else {
      set({ items: [...currentItems, { product, quantity }] })
    }
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter(i => i.product.id !== productId) })
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }
    set({
      items: get().items.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    })
  },

  clearCart: () => set({ items: [] }),

  getTotalAmount: () => {
    return get().items.reduce(
      (acc, item) => acc + item.quantity * Number(item.product.selling_price),
      0
    )
  },

  getTotalItemsCount: () => {
    return get().items.reduce((acc, item) => acc + item.quantity, 0)
  },
}))
