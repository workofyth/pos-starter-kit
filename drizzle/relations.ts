import { relations } from "drizzle-orm/relations";
import { categories, products, purchaseOrderDetails, purchaseOrders, transactionDetails, transactions, user, session, branches, members, userBranches, suppliers, account, notifications, inventory, productPrices, inventoryTransactions, draftOrders } from "./schema";

export const productsRelations = relations(products, ({one, many}) => ({
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	purchaseOrderDetails: many(purchaseOrderDetails),
	transactionDetails: many(transactionDetails),
	inventories: many(inventory),
	productPrices: many(productPrices),
	inventoryTransactions: many(inventoryTransactions),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	products: many(products),
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
}));

export const purchaseOrderDetailsRelations = relations(purchaseOrderDetails, ({one}) => ({
	product: one(products, {
		fields: [purchaseOrderDetails.productId],
		references: [products.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderDetails.purchaseOrderId],
		references: [purchaseOrders.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	purchaseOrderDetails: many(purchaseOrderDetails),
	branch: one(branches, {
		fields: [purchaseOrders.branchId],
		references: [branches.id]
	}),
	supplier: one(suppliers, {
		fields: [purchaseOrders.supplierId],
		references: [suppliers.id]
	}),
}));

export const transactionDetailsRelations = relations(transactionDetails, ({one}) => ({
	product: one(products, {
		fields: [transactionDetails.productId],
		references: [products.id]
	}),
	transaction: one(transactions, {
		fields: [transactionDetails.transactionId],
		references: [transactions.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one, many}) => ({
	transactionDetails: many(transactionDetails),
	branch: one(branches, {
		fields: [transactions.branchId],
		references: [branches.id]
	}),
	user: one(user, {
		fields: [transactions.cashierId],
		references: [user.id]
	}),
	member: one(members, {
		fields: [transactions.memberId],
		references: [members.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	transactions: many(transactions),
	userBranches: many(userBranches),
	accounts: many(account),
	notifications: many(notifications),
	inventoryTransactions_approvedBy: many(inventoryTransactions, {
		relationName: "inventoryTransactions_approvedBy_user_id"
	}),
	inventoryTransactions_createdBy: many(inventoryTransactions, {
		relationName: "inventoryTransactions_createdBy_user_id"
	}),
	draftOrders_cashierId: many(draftOrders, {
		relationName: "draftOrders_cashierId_user_id"
	}),
	draftOrders_userId: many(draftOrders, {
		relationName: "draftOrders_userId_user_id"
	}),
}));

export const branchesRelations = relations(branches, ({many}) => ({
	transactions: many(transactions),
	userBranches: many(userBranches),
	purchaseOrders: many(purchaseOrders),
	notifications: many(notifications),
	inventories: many(inventory),
	productPrices: many(productPrices),
	inventoryTransactions: many(inventoryTransactions),
	draftOrders: many(draftOrders),
}));

export const membersRelations = relations(members, ({many}) => ({
	transactions: many(transactions),
	draftOrders: many(draftOrders),
}));

export const userBranchesRelations = relations(userBranches, ({one}) => ({
	branch: one(branches, {
		fields: [userBranches.branchId],
		references: [branches.id]
	}),
	user: one(user, {
		fields: [userBranches.userId],
		references: [user.id]
	}),
}));

export const suppliersRelations = relations(suppliers, ({many}) => ({
	purchaseOrders: many(purchaseOrders),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	branch: one(branches, {
		fields: [notifications.branchId],
		references: [branches.id]
	}),
	user: one(user, {
		fields: [notifications.userId],
		references: [user.id]
	}),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
	branch: one(branches, {
		fields: [inventory.branchId],
		references: [branches.id]
	}),
	product: one(products, {
		fields: [inventory.productId],
		references: [products.id]
	}),
}));

export const productPricesRelations = relations(productPrices, ({one}) => ({
	branch: one(branches, {
		fields: [productPrices.branchId],
		references: [branches.id]
	}),
	product: one(products, {
		fields: [productPrices.productId],
		references: [products.id]
	}),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({one}) => ({
	user_approvedBy: one(user, {
		fields: [inventoryTransactions.approvedBy],
		references: [user.id],
		relationName: "inventoryTransactions_approvedBy_user_id"
	}),
	branch: one(branches, {
		fields: [inventoryTransactions.branchId],
		references: [branches.id]
	}),
	user_createdBy: one(user, {
		fields: [inventoryTransactions.createdBy],
		references: [user.id],
		relationName: "inventoryTransactions_createdBy_user_id"
	}),
	product: one(products, {
		fields: [inventoryTransactions.productId],
		references: [products.id]
	}),
}));

export const draftOrdersRelations = relations(draftOrders, ({one}) => ({
	branch: one(branches, {
		fields: [draftOrders.branchId],
		references: [branches.id]
	}),
	user_cashierId: one(user, {
		fields: [draftOrders.cashierId],
		references: [user.id],
		relationName: "draftOrders_cashierId_user_id"
	}),
	member: one(members, {
		fields: [draftOrders.memberId],
		references: [members.id]
	}),
	user_userId: one(user, {
		fields: [draftOrders.userId],
		references: [user.id],
		relationName: "draftOrders_userId_user_id"
	}),
}));