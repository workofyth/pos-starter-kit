import { pgTable, foreignKey, unique, text, numeric, timestamp, integer, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const branchType = pgEnum("branch_type", ['main', 'sub'])
export const discountType = pgEnum("discount_type", ['percentage', 'fixed_amount'])
export const inventoryTransactionType = pgEnum("inventory_transaction_type", ['in', 'out', 'adjustment', 'receive', 'delivery', 'split'])
export const paymentMethod = pgEnum("payment_method", ['cash', 'card', 'transfer', 'credit'])
export const transactionStatus = pgEnum("transaction_status", ['pending', 'completed', 'cancelled', 'refunded'])
export const userRole = pgEnum("user_role", ['admin', 'manager', 'cashier', 'staff'])


export const products = pgTable("products", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	sku: text().notNull(),
	barcode: text().notNull(),
	image: text(),
	imageUrl: text("image_url"),
	categoryId: text("category_id"),
	unit: text().default('pcs').notNull(),
	profitMargin: numeric("profit_margin", { precision: 5, scale:  2 }).default('0.00'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "products_category_id_categories_id_fk"
		}).onDelete("set null"),
	unique("products_sku_unique").on(table.sku),
	unique("products_barcode_unique").on(table.barcode),
]);

export const purchaseOrderDetails = pgTable("purchase_order_details", {
	id: text().primaryKey().notNull(),
	purchaseOrderId: text("purchase_order_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 12, scale:  2 }).notNull(),
	receivedQuantity: integer("received_quantity").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "purchase_order_details_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.purchaseOrderId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_details_purchase_order_id_purchase_orders_id_fk"
		}).onDelete("cascade"),
]);

export const transactionDetails = pgTable("transaction_details", {
	id: text().primaryKey().notNull(),
	transactionId: text("transaction_id").notNull(),
	productId: text("product_id").notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 12, scale:  2 }).notNull(),
	discountAmount: numeric("discount_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "transaction_details_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [transactions.id],
			name: "transaction_details_transaction_id_transactions_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const transactions = pgTable("transactions", {
	id: text().primaryKey().notNull(),
	transactionNumber: text("transaction_number").notNull(),
	branchId: text("branch_id").notNull(),
	cashierId: text("cashier_id").notNull(),
	memberId: text("member_id"),
	status: transactionStatus().default('completed').notNull(),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	discountAmount: numeric("discount_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	paidAmount: numeric("paid_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	changeAmount: numeric("change_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	paymentMethod: paymentMethod("payment_method").notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "transactions_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cashierId],
			foreignColumns: [user.id],
			name: "transactions_cashier_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.id],
			name: "transactions_member_id_members_id_fk"
		}).onDelete("set null"),
	unique("transactions_transaction_number_unique").on(table.transactionNumber),
]);

export const userBranches = pgTable("user_branches", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	branchId: text("branch_id").notNull(),
	role: userRole().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isMainAdmin: boolean("is_main_admin").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "user_branches_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_branches_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: text().primaryKey().notNull(),
	orderNumber: text("order_number").notNull(),
	supplierId: text("supplier_id").notNull(),
	branchId: text("branch_id").notNull(),
	status: text().default('pending').notNull(),
	subtotal: numeric({ precision: 12, scale:  2 }).notNull(),
	discountAmount: numeric("discount_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	notes: text(),
	expectedDeliveryDate: timestamp("expected_delivery_date", { mode: 'string' }),
	receivedDate: timestamp("received_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "purchase_orders_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [suppliers.id],
			name: "purchase_orders_supplier_id_suppliers_id_fk"
		}).onDelete("cascade"),
	unique("purchase_orders_order_number_unique").on(table.orderNumber),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const suppliers = pgTable("suppliers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	contactPerson: text("contact_person"),
	phone: text().notNull(),
	email: text(),
	address: text(),
	paymentTerm: text("payment_term"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	code: text().notNull(),
	parentId: text("parent_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}).onDelete("set null"),
	unique("categories_code_unique").on(table.code),
]);

export const branches = pgTable("branches", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	address: text().notNull(),
	phone: text(),
	email: text(),
	type: branchType().default('sub'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const discounts = pgTable("discounts", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	type: discountType().notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const notifications = pgTable("notifications", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	branchId: text("branch_id").notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: text().notNull(),
	data: jsonb(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "notifications_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "notifications_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const inventory = pgTable("inventory", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	branchId: text("branch_id").notNull(),
	quantity: integer().default(0).notNull(),
	minStock: integer("min_stock").default(0).notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "inventory_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const productPrices = pgTable("product_prices", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	branchId: text("branch_id"),
	purchasePrice: numeric("purchase_price", { precision: 12, scale:  2 }).notNull(),
	sellingPrice: numeric("selling_price", { precision: 12, scale:  2 }).notNull(),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "product_prices_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_prices_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const members = pgTable("members", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	phone: text().notNull(),
	email: text(),
	address: text(),
	points: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("members_email_unique").on(table.email),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: text().primaryKey().notNull(),
	productId: text("product_id").notNull(),
	branchId: text("branch_id").notNull(),
	type: inventoryTransactionType().notNull(),
	quantity: integer().notNull(),
	referenceId: text("reference_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	createdBy: text("created_by"),
	status: text().default('pending'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	approvedBy: text("approved_by"),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [user.id],
			name: "inventory_transactions_approved_by_user_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "inventory_transactions_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "inventory_transactions_created_by_user_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_transactions_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const draftOrders = pgTable("draft_orders", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	branchId: text("branch_id").notNull(),
	cashierId: text("cashier_id").notNull(),
	memberId: text("member_id"),
	cartData: jsonb("cart_data").notNull(),
	paymentMethod: paymentMethod("payment_method").default('cash'),
	discountRate: numeric("discount_rate", { precision: 5, scale:  2 }).default('0.00'),
	notes: text(),
	total: numeric({ precision: 12, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "draft_orders_branch_id_branches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.cashierId],
			foreignColumns: [user.id],
			name: "draft_orders_cashier_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.id],
			name: "draft_orders_member_id_members_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "draft_orders_user_id_user_id_fk"
		}).onDelete("cascade"),
]);
