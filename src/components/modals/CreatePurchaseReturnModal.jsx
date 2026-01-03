import React, { useState, useEffect } from 'react';
import { Package, X, Trash2 } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../ui/Toast';

export default function CreatePurchaseReturnModal({ isOpen, onClose, onComplete, purchaseOrder }) {
    const [returnItems, setReturnItems] = useState([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && purchaseOrder) {
            // Fetch full PO details if items are missing
            if (!purchaseOrder.items) {
                window.electronAPI.purchaseOrders.getById(purchaseOrder.id).then(fullPO => {
                    const items = fullPO?.items || [];
                    setReturnItems(items.map(item => ({
                        ...item,
                        returnQuantity: 0,
                        reason: 'damaged'
                    })));
                });
            } else {
                setReturnItems(purchaseOrder.items.map(item => ({
                    ...item,
                    returnQuantity: 0,
                    reason: 'damaged'
                })));
            }
            setNotes('');
        }
    }, [isOpen, purchaseOrder]);

    const handleQuantityChange = (index, value) => {
        const newItems = [...returnItems];
        newItems[index].returnQuantity = Math.min(Math.max(0, parseInt(value) || 0), newItems[index].quantity);
        setReturnItems(newItems);
    };

    const handleReasonChange = (index, value) => {
        const newItems = [...returnItems];
        newItems[index].reason = value;
        setReturnItems(newItems);
    };

    const handleSubmit = async () => {
        const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);

        if (itemsToReturn.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }

        setIsSubmitting(true);
        try {
            await window.electronAPI.purchaseReturns.create({
                purchase_order_id: purchaseOrder.id,
                supplier_id: purchaseOrder.supplier_id,
                items: itemsToReturn.map(item => ({
                    product_id: item.product_id,
                    product_name: item.product_name || item.name, // Handle potentially different field names
                    quantity: item.returnQuantity,
                    unit_cost: item.unit_cost,
                    reason: item.reason
                })),
                notes
            });
            toast.success('Return created successfully');
            onComplete();
        } catch (error) {
            console.error('Return error:', error);
            toast.error('Failed to create return');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!purchaseOrder) return null;

    const totalReturnAmount = returnItems.reduce((sum, item) => sum + (item.returnQuantity * item.unit_cost), 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Create Return for PO #${purchaseOrder.po_number || 'Draft'}`}>
            <ModalBody>
                <div className="space-y-4">
                    <div className="bg-dark-tertiary p-3 rounded-lg flex justify-between items-center">
                        <span className="text-zinc-400">Total Refund Amount</span>
                        <span className="text-xl font-bold text-red-400">${totalReturnAmount.toFixed(2)}</span>
                    </div>

                    <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                        {returnItems.map((item, index) => (
                            <div key={item.id || index} className="p-3 bg-dark-tertiary/50 rounded-lg border border-dark-border">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium">{item.product_name || item.name}</p>
                                        <p className="text-xs text-zinc-500">Purchased: {item.quantity} units @ ${item.unit_cost?.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">${(item.returnQuantity * item.unit_cost).toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-24">
                                        <Input
                                            type="number"
                                            value={item.returnQuantity}
                                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                                            min="0"
                                            max={item.quantity}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <Select
                                            className="w-full"
                                            value={item.reason}
                                            onChange={(val) => handleReasonChange(index, val)}
                                            options={[
                                                { value: 'damaged', label: 'Damaged' },
                                                { value: 'wrong_item', label: 'Wrong Item' },
                                                { value: 'expired', label: 'Expired' },
                                                { value: 'other', label: 'Other' }
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm text-zinc-400">Notes</label>
                        <textarea
                            className="w-full bg-dark-tertiary border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-accent-primary min-h-[60px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Reason for return..."
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleSubmit} loading={isSubmitting} variant="destructive">
                    Create Return
                </Button>
            </ModalFooter>
        </Modal>
    );
}
