import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export const useCartStore = create((set, get) => ({
    items: [],
    customer: null,
    discount: 0,
    discountType: 'fixed', // 'fixed' or 'percent'
    notes: '',

    taxType: 'inclusive', // 'exclusive' or 'inclusive' - default to inclusive
    globalTaxRate: 10, // Default to 10% to match database default
    currency: 'USD',
    serviceCharge: 0,
    taxExempt: false,

    loadSettings: async () => {
        try {
            const settings = await window.electronAPI.settings.getAll();
            console.log('=== LOAD SETTINGS DEBUG ===');
            console.log('Raw settings from DB:', settings);

            let parsed = { ...settings };
            if (settings.store_config) {
                try {
                    // store_config may already be an object (from new getAll) or a string (legacy)
                    let storeConfig = settings.store_config;
                    if (typeof storeConfig === 'string') {
                        storeConfig = JSON.parse(storeConfig);
                    }
                    console.log('Parsed store_config:', storeConfig);
                    parsed = { ...parsed, ...storeConfig };
                } catch (e) {
                    console.error('Error parsing store_config:', e);
                }
            }

            const finalTaxType = parsed.taxType || 'inclusive';
            const finalTaxRate = parseFloat(parsed.taxRate) || 10;
            const finalCurrency = parsed.currency || 'LKR';

            console.log('Final taxType:', finalTaxType);
            console.log('Final globalTaxRate:', finalTaxRate);
            console.log('Final currency:', finalCurrency);
            console.log('===========================');

            set({
                taxType: finalTaxType,
                globalTaxRate: finalTaxRate,
                currency: finalCurrency
            });
        } catch (e) {
            console.error('Failed to load settings in cart store', e);
        }
    },

    setServiceCharge: (amount) => set({ serviceCharge: amount }),
    setTaxExempt: (isExempt) => set({ taxExempt: isExempt }),

    addItem: (product, quantity = 1) => {
        const { items, globalTaxRate } = get();
        const existingIndex = items.findIndex(item => item.product_id === product.id);
        // Use product-specific tax only if explicitly set (> 0), otherwise use global rate
        const itemTaxRate = (product.tax_rate && product.tax_rate > 0) ? product.tax_rate : globalTaxRate;

        if (existingIndex >= 0) {
            const newItems = [...items];
            const currentQty = newItems[existingIndex].quantity;
            const maxStock = newItems[existingIndex].max_stock || product.stock_quantity || 999999;

            if (currentQty + quantity > maxStock) {
                return { success: false, message: 'Insufficient stock' };
            }

            newItems[existingIndex].quantity += quantity;
            newItems[existingIndex].total = newItems[existingIndex].quantity * newItems[existingIndex].unit_price;
            set({ items: newItems });
            return { success: true };
        } else {
            if (quantity > product.stock_quantity) {
                return { success: false, message: 'Insufficient stock' };
            }

            const newItem = {
                id: uuid(),
                product_id: product.id,
                product_name: product.name,
                quantity,
                unit_price: product.price,
                tax_rate: itemTaxRate,
                discount: 0,
                total: quantity * product.price,
                max_stock: product.stock_quantity
            };
            set({ items: [...items, newItem] });
            return { success: true };
        }
    },

    updateItemQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(itemId);
            return { success: true };
        }

        const { items } = get();
        const item = items.find(i => i.id === itemId);
        if (!item) return { success: false, message: 'Item not found' };

        if (item.max_stock !== undefined && quantity > item.max_stock) {
            return { success: false, message: 'Cannot exceed available stock' };
        }

        set(state => ({
            items: state.items.map(item =>
                item.id === itemId
                    ? { ...item, quantity, total: quantity * item.unit_price }
                    : item
            )
        }));
        return { success: true };
    },

    removeItem: (itemId) => {
        set(state => ({
            items: state.items.filter(item => item.id !== itemId)
        }));
    },

    setItemDiscount: (itemId, discount) => {
        set(state => ({
            items: state.items.map(item =>
                item.id === itemId
                    ? { ...item, discount, total: (item.quantity * item.unit_price) - discount }
                    : item
            )
        }));
    },

    setCustomer: (customer) => {
        set({ customer });
    },

    setDiscount: (discount, discountType = 'fixed') => {
        set({ discount, discountType });
    },

    setNotes: (notes) => {
        set({ notes });
    },

    getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.total, 0);
    },

    getTaxAmount: () => {
        const { items, taxType, taxExempt, globalTaxRate } = get();
        if (taxExempt) return 0;
        return items.reduce((sum, item) => {
            // Use item's tax_rate if set, otherwise use global rate
            const effectiveRate = (item.tax_rate && item.tax_rate > 0) ? item.tax_rate : globalTaxRate;
            const rate = effectiveRate / 100;
            let itemTax = 0;
            if (taxType === 'inclusive') {
                const baseAmount = item.total / (1 + rate);
                itemTax = item.total - baseAmount;
            } else {
                itemTax = item.total * rate;
            }
            return sum + itemTax;
        }, 0);
    },

    getDiscountAmount: () => {
        const { discount, discountType } = get();
        const subtotal = get().getSubtotal();
        if (discountType === 'percent') {
            return (subtotal * discount) / 100;
        }
        return discount;
    },

    getTotal: () => {
        const subtotal = get().getSubtotal();
        const tax = get().getTaxAmount();
        const discountAmount = get().getDiscountAmount();
        const { taxType, serviceCharge } = get();

        let total = subtotal;
        if (taxType === 'inclusive') {
            total = subtotal - discountAmount;
        } else {
            total = subtotal + tax - discountAmount;
        }
        return total + (serviceCharge || 0);
    },

    getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
    },

    clearCart: () => {
        set({
            items: [],
            customer: null,
            discount: 0,
            discountType: 'fixed',
            serviceCharge: 0,
            taxExempt: false,
            notes: '',
        });
    },

    holdTransaction: async (employeeId) => {
        const { items, customer, notes } = get();
        if (items.length === 0) return null;
        const held = {
            id: uuid(),
            employee_id: employeeId,
            customer_id: customer?.id,
            items,
            subtotal: get().getSubtotal(),
            notes,
        };
        await window.electronAPI.held.create(held);
        get().clearCart();
        return held;
    },

    recallTransaction: (held) => {
        const items = typeof held.items_json === 'string'
            ? JSON.parse(held.items_json)
            : held.items;
        set({
            items,
            customer: held.customer_id ? { id: held.customer_id, name: held.customer_name } : null,
            notes: held.notes || '',
            discount: 0,
            discountType: 'fixed',
            serviceCharge: 0, // Reset these as they might not be in held data yet
            taxExempt: false
        });
    },

    loadQuote: (quote) => {
        set({
            items: quote.items.map(item => ({
                id: uuid(),
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: 0,
                total: item.quantity * item.unit_price
            })),
            customer: quote.customer_id ? { id: quote.customer_id, name: quote.customer_name } : null,
            discount: quote.discount_amount || 0,
            discountType: 'fixed',
            notes: quote.notes || '',
        });
    },

    processPayment: async (payments, employeeId) => {
        const { items, customer, notes, discount, discountType, serviceCharge, taxExempt } = get();
        if (items.length === 0) throw new Error('Cart is empty');

        const receiptNumber = await window.electronAPI.generateReceiptNumber();
        const subtotal = get().getSubtotal();
        const taxAmount = get().getTaxAmount();
        const discountAmount = get().getDiscountAmount();
        const total = get().getTotal();

        const saleItems = items.map(item => ({
            ...item,
            tax_amount: (taxExempt) ? 0 : (item.total * (item.tax_rate / 100)), // Approximate for record
        }));

        const sale = {
            id: uuid(),
            receipt_number: receiptNumber,
            employee_id: employeeId,
            customer_id: customer?.id || null,
            subtotal,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            service_charge: serviceCharge || 0, // NEW field
            tax_exempt: taxExempt ? 1 : 0,      // NEW field
            total,
            status: 'completed',
            notes,
            items: saleItems,
            payments: payments.map(p => ({ ...p, id: uuid() })),
        };

        await window.electronAPI.sales.create(sale);

        if (customer) {
            const points = Math.floor(total / 10);
            const updatedCustomer = {
                ...customer,
                loyalty_points: (customer.loyalty_points || 0) + points,
                total_spent: (customer.total_spent || 0) + total,
            };
            await window.electronAPI.customers.update(updatedCustomer);
        }

        get().clearCart();
        return sale;
    },
}));
