export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole =
  | 'GLOBAL_ADMIN'
  | 'STORE_ADMIN'
  | 'FINANCE'
  | 'SELLER'
  | 'INVENTORY'
  | 'VIEWER'

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type OrderChannel =
  | 'IN_STORE'
  | 'WHATSAPP'
  | 'CATALOG'
  | 'ECOMMERCE'
  | 'API'

export type PaymentMethod =
  | 'CASH'
  | 'PIX'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BOLETO'
  | 'BANK_TRANSFER'
  | 'OTHER'

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED'

export type StockMovementType =
  | 'ENTRY'
  | 'EXIT'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'LOSS'
  | 'DAMAGE'
  | 'EXPIRATION'
  | 'TRANSFER'
  | 'INVENTORY_COUNT'

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          is_global_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_global_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_global_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          document: string | null
          email: string | null
          phone: string | null
          whatsapp: string | null
          logo_url: string | null
          banner_url: string | null
          description: string | null
          address_street: string | null
          address_number: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          address_zipcode: string | null
          is_active: boolean
          theme_config: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          document?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          logo_url?: string | null
          banner_url?: string | null
          description?: string | null
          address_street?: string | null
          address_number?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zipcode?: string | null
          is_active?: boolean
          theme_config?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          document?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          logo_url?: string | null
          banner_url?: string | null
          description?: string | null
          address_street?: string | null
          address_number?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zipcode?: string | null
          is_active?: boolean
          theme_config?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      store_users: {
        Row: {
          id: string
          store_id: string
          user_id: string
          role: UserRole
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          id: string
          code: string
          name: string
          module: string
          description: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          module: string
          description?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          module?: string
          description?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          role_code: string
          permission_code: string
        }
        Insert: {
          id?: string
          role_code: string
          permission_code: string
        }
        Update: {
          id?: string
          role_code?: string
          permission_code?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          store_id: string
          name: string
          slug: string
          parent_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          slug: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          slug?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          store_id: string
          name: string
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      manufacturers: {
        Row: {
          id: string
          store_id: string
          name: string
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          created_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          sku: string
          barcode: string | null
          ean: string | null
          description: string | null
          category_id: string | null
          brand_id: string | null
          manufacturer_id: string | null
          supplier_id: string | null
          cost_price: number
          selling_price: number
          margin_percentage: number | null
          unit: string
          weight_kg: number | null
          dimensions: Json | null
          min_stock: number
          max_stock: number
          controls_batch: boolean
          controls_expiration: boolean
          is_active: boolean
          is_published_catalog: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          sku: string
          barcode?: string | null
          ean?: string | null
          description?: string | null
          category_id?: string | null
          brand_id?: string | null
          manufacturer_id?: string | null
          supplier_id?: string | null
          cost_price?: number
          selling_price?: number
          margin_percentage?: number | null
          unit?: string
          weight_kg?: number | null
          dimensions?: Json | null
          min_stock?: number
          max_stock?: number
          controls_batch?: boolean
          controls_expiration?: boolean
          is_active?: boolean
          is_published_catalog?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          sku?: string
          barcode?: string | null
          ean?: string | null
          description?: string | null
          category_id?: string | null
          brand_id?: string | null
          manufacturer_id?: string | null
          supplier_id?: string | null
          cost_price?: number
          selling_price?: number
          margin_percentage?: number | null
          unit?: string
          weight_kg?: number | null
          dimensions?: Json | null
          min_stock?: number
          max_stock?: number
          controls_batch?: boolean
          controls_expiration?: boolean
          is_active?: boolean
          is_published_catalog?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          store_id: string
          storage_path: string
          public_url: string
          is_primary: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          store_id: string
          storage_path: string
          public_url: string
          is_primary?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          store_id?: string
          storage_path?: string
          public_url?: string
          is_primary?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: []
      }
      stock_balances: {
        Row: {
          id: string
          store_id: string
          product_id: string
          quantity: number
          reserved_quantity: number
          available_quantity: number
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          quantity?: number
          reserved_quantity?: number
          available_quantity?: number
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          available_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          store_id: string
          product_id: string
          batch_id: string | null
          movement_type: StockMovementType
          quantity: number
          previous_quantity: number
          new_quantity: number
          unit_cost: number | null
          reference_id: string | null
          reference_type: string | null
          notes: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          batch_id?: string | null
          movement_type: StockMovementType
          quantity: number
          previous_quantity: number
          new_quantity: number
          unit_cost?: number | null
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          batch_id?: string | null
          movement_type?: StockMovementType
          quantity?: number
          previous_quantity?: number
          new_quantity?: number
          unit_cost?: number | null
          reference_id?: string | null
          reference_type?: string | null
          notes?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      stock_batches: {
        Row: {
          id: string
          store_id: string
          product_id: string
          lot_number: string
          quantity: number
          cost_price: number | null
          manufacturing_date: string | null
          expiration_date: string | null
          status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'BLOCKED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          lot_number: string
          quantity?: number
          cost_price?: number | null
          manufacturing_date?: string | null
          expiration_date?: string | null
          status?: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'BLOCKED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          product_id?: string
          lot_number?: string
          quantity?: number
          cost_price?: number | null
          manufacturing_date?: string | null
          expiration_date?: string | null
          status?: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'BLOCKED'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          store_id: string
          name: string
          document: string | null
          email: string | null
          phone: string | null
          whatsapp: string | null
          notes: string | null
          status: 'ACTIVE' | 'INACTIVE'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          document?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          notes?: string | null
          status?: 'ACTIVE' | 'INACTIVE'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          document?: string | null
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          notes?: string | null
          status?: 'ACTIVE' | 'INACTIVE'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          store_id: string
          corporate_name: string
          trade_name: string | null
          document: string | null
          contact_name: string | null
          phone: string | null
          email: string | null
          notes: string | null
          status: 'ACTIVE' | 'INACTIVE'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          corporate_name: string
          trade_name?: string | null
          document?: string | null
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          status?: 'ACTIVE' | 'INACTIVE'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          corporate_name?: string
          trade_name?: string | null
          document?: string | null
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          notes?: string | null
          status?: 'ACTIVE' | 'INACTIVE'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          id: string
          store_id: string
          supplier_id: string
          order_number: string
          status: PurchaseOrderStatus
          subtotal: number
          shipping_cost: number
          total_amount: number
          notes: string | null
          issued_at: string | null
          received_at: string | null
          cancelled_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          supplier_id: string
          order_number: string
          status?: PurchaseOrderStatus
          subtotal?: number
          shipping_cost?: number
          total_amount?: number
          notes?: string | null
          issued_at?: string | null
          received_at?: string | null
          cancelled_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          supplier_id?: string
          order_number?: string
          status?: PurchaseOrderStatus
          subtotal?: number
          shipping_cost?: number
          total_amount?: number
          notes?: string | null
          issued_at?: string | null
          received_at?: string | null
          cancelled_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          id: string
          purchase_order_id: string
          store_id: string
          product_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
          total_cost: number
          lot_number: string | null
          expiration_date: string | null
        }
        Insert: {
          id?: string
          purchase_order_id: string
          store_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_cost: number
          total_cost: number
          lot_number?: string | null
          expiration_date?: string | null
        }
        Update: {
          id?: string
          purchase_order_id?: string
          store_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
          total_cost?: number
          lot_number?: string | null
          expiration_date?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          store_id: string
          customer_id: string | null
          user_id: string | null
          order_number: string
          channel: OrderChannel
          status: OrderStatus
          subtotal: number
          discount_amount: number
          shipping_amount: number
          total_amount: number
          notes: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          customer_id?: string | null
          user_id?: string | null
          order_number: string
          channel?: OrderChannel
          status?: OrderStatus
          subtotal?: number
          discount_amount?: number
          shipping_amount?: number
          total_amount?: number
          notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          customer_id?: string | null
          user_id?: string | null
          order_number?: string
          channel?: OrderChannel
          status?: OrderStatus
          subtotal?: number
          discount_amount?: number
          shipping_amount?: number
          total_amount?: number
          notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          store_id: string
          product_id: string
          batch_id: string | null
          quantity: number
          unit_price: number
          unit_cost: number | null
          discount: number
          total_price: number
        }
        Insert: {
          id?: string
          order_id: string
          store_id: string
          product_id: string
          batch_id?: string | null
          quantity: number
          unit_price: number
          unit_cost?: number | null
          discount?: number
          total_price: number
        }
        Update: {
          id?: string
          order_id?: string
          store_id?: string
          product_id?: string
          batch_id?: string | null
          quantity?: number
          unit_price?: number
          unit_cost?: number | null
          discount?: number
          total_price?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          order_id: string
          store_id: string
          method: PaymentMethod
          amount: number
          status: PaymentStatus
          transaction_id: string | null
          provider: string | null
          details: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          store_id: string
          method: PaymentMethod
          amount: number
          status?: PaymentStatus
          transaction_id?: string | null
          provider?: string | null
          details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          store_id?: string
          method?: PaymentMethod
          amount?: number
          status?: PaymentStatus
          transaction_id?: string | null
          provider?: string | null
          details?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          id: string
          order_id: string
          store_id: string
          carrier: string | null
          tracking_code: string | null
          shipping_type: string | null
          cost: number
          status: string
          delivery_address: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          store_id: string
          carrier?: string | null
          tracking_code?: string | null
          shipping_type?: string | null
          cost?: number
          status?: string
          delivery_address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          store_id?: string
          carrier?: string | null
          tracking_code?: string | null
          shipping_type?: string | null
          cost?: number
          status?: string
          delivery_address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          store_id: string
          user_id: string | null
          type: string
          title: string
          message: string
          metadata: Json | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id?: string | null
          type: string
          title: string
          message: string
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          user_id?: string | null
          type?: string
          title?: string
          message?: string
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          store_id: string | null
          user_id: string | null
          action: string
          entity: string
          entity_id: string | null
          before_data: Json | null
          after_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id?: string | null
          user_id?: string | null
          action: string
          entity: string
          entity_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          store_id?: string | null
          user_id?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_global_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_store_access: {
        Args: { check_store_id: string }
        Returns: boolean
      }
      process_sale_stock_deduction: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      restore_sale_stock: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      receive_purchase_order_stock: {
        Args: { p_purchase_order_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role_enum: UserRole
      order_status_enum: OrderStatus
      order_channel_enum: OrderChannel
      payment_method_enum: PaymentMethod
      payment_status_enum: PaymentStatus
      stock_movement_type_enum: StockMovementType
      purchase_order_status_enum: PurchaseOrderStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
