import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, FileText } from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { toast } from '../ui/Toast';

export default function RecordSupplierPaymentModal({ isOpen, onClose, onComplete, purchaseOrder }) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && purchaseOrder) {
            // Calculate remaining balance
            const total = purchaseOrder.total || 0;
            const paid = purchaseOrder.amount_paid || 0;
            const remaining = Math.max(0, total - paid);
            setAmount(remaining.toString());
            setReference('');
            setNotes('');
        }
    }, [isOpen, purchaseOrder]);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);
        try {
            await window.electronAPI.purchaseOrders.recordPayment({
                purchase_order_id: purchaseOrder.id,
                supplier_id: purchaseOrder.supplier_id,
                amount: parseFloat(amount),
                payment_method: paymentMethod,
                reference,
                notes
            });
            toast.success('Payment recorded successfully');
            onComplete();
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Failed to record payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!purchaseOrder) return null;

    const total = purchaseOrder.total || 0;
    const paid = purchaseOrder.amount_paid || 0;
    const remaining = total - paid;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment for PO #${purchaseOrder.po_number || 'Draft'}`}>
            <ModalBody>
                <div className="space-y-4">
                    <div className="bg-dark-tertiary p-4 rounded-lg flex justify-between items-center mb-4">
                        <div>
                            <p className="text-zinc-400 text-sm">Amount Due</p>
                            <p className="text-xl font-bold text-white">${remaining.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-zinc-400 text-sm">Total PO Value</p>
                            <p className="font-medium text-white">${total.toFixed(2)}</p>
                        </div>
                    </div>

                    <Input
                        label="Payment Amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        icon={DollarSign}
                        step="0.01"
                    />

                    <Select
                        label="Payment Method"
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                        options={[
                            { value: 'bank_transfer', label: 'Bank Transfer' },
                            { value: 'cash', label: 'Cash' },
                            { value: 'check', label: 'Check' },
                            { value: 'card', label: 'Credit Card' },
                            { value: 'other', label: 'Other' }
                        ]}
                        icon={CreditCard}
                    />

                    <Input
                        label="Reference / Transaction ID"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. TR-123456"
                        icon={FileText}
                    />

                    <div className="space-y-1">
                        <label className="text-sm text-zinc-400">Notes</label>
                        <textarea
                            className="w-full bg-dark-tertiary border border-dark-border rounded-lg p-3 text-white focus:outline-none focus:border-accent-primary min-h-[80px]"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes..."
                        />
                    </div>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleSubmit} loading={isSubmitting}>
                    Record Payment
                </Button>
            </ModalFooter>
        </Modal>
    );
}
