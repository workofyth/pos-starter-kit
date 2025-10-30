import { pgTable, text, timestamp, integer, decimal, boolean, jsonb, pgEnum, bigint } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Define enums for the POS application
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "cashier", "staff"]);
export const branchTypeEnum = pgEnum("branch_type", ["main", "sub"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "transfer", "credit"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "cancelled", "refunded"]);
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed_amount"]);
export const inventoryTransactionTypeEnum = pgEnum("inventory_transaction_type", ["in", "out", "adjustment", "receive", "delivery", "split"]);

// Branches table (for multi-cabang support)
export const branches = pgTable("branches", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  type: branchTypeEnum("type").default("sub"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users extension table with role-based access and branch association
export const userBranches = pgTable("user_branches", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull(),
  isMainAdmin: boolean("is_main_admin").default(false).notNull(), // Flag to identify main/super admin
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  code: text("code").notNull().unique(), // E.g., FB for Freebase, SL for SaltNic, etc.
  parentId: text("parent_id").references((): any => categories.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Products table
export const products = pgTable("products", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").notNull().unique(),
  image: text("image"), // URL or path to product image
  imageUrl: text("image_url"), // Path to stored image
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  unit: text("unit").default("pcs").notNull(), // pcs, kg, ltr, etc.
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).default("0.00"), // Profit margin percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product prices table (to track price changes over time)
export const productPrices = pgTable("product_prices", {
  id: text("id").primaryKey().notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }).notNull(), // Harga beli
  sellingPrice: decimal("selling_price", { precision: 12, scale: 2 }).notNull(), // Harga jual
  effectiveDate: timestamp("effective_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Members table
export const members = pgTable("members", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").unique(),
  address: text("address"),
  points: integer("points").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone").notNull(),
  email: text("email"),
  address: text("address"),
  paymentTerm: text("payment_term"), // e.g., "Net 30", "Net 60"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory table
export const inventory = pgTable("inventory", {
  id: text("id").primaryKey().notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(0).notNull(),
  minStock: integer("min_stock").default(0).notNull(),
  maxStock: integer("min_stock").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory transactions (for tracking stock movements)
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: text("id").primaryKey().notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  type: inventoryTransactionTypeEnum("type").notNull(), // in, out, adjustment
  quantity: integer("quantity").notNull(),
  referenceId: text("reference_id"), // ID of the related transaction (e.g., sales, purchase order)
  status: text("status").default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),
});

// Discounts table
export const discounts = pgTable("discounts", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: discountTypeEnum("type").notNull(), // percentage or fixed amount
  value: decimal("value", { precision: 10, scale: 2 }).notNull(), // percentage or fixed amount
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transaction table
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey().notNull(),
  transactionNumber: text("transaction_number").notNull().unique(),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  cashierId: text("cashier_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
  status: transactionStatusEnum("status").default("completed").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  changeAmount: decimal("change_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Transaction details table
export const transactionDetails = pgTable("transaction_details", {
  id: text("id").primaryKey().notNull(),
  transactionId: text("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Purchase orders (for inventory management)
export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey().notNull(),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliers.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(), // pending, received, cancelled
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  receivedDate: timestamp("received_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Purchase order details
export const purchaseOrderDetails = pgTable("purchase_order_details", {
  id: text("id").primaryKey().notNull(),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Draft orders table (for saving partial orders to continue later)
export const draftOrders = pgTable("draft_orders", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  branchId: text("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  cashierId: text("cashier_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
  cartData: jsonb("cart_data").notNull(), // Stores the cart items as JSON
  paymentMethod: paymentMethodEnum("payment_method").default("cash"),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0.00"),
  notes: text("notes"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // Optional: link to specific user
  branchId: text("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(), // Target branch for the notification
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // e.g., 'stock_split', 'inventory_update', 'approval_request', etc.
  data: jsonb("data"), // Additional data related to the notification
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export { user };
