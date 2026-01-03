import { useState, useEffect } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tabs } from '../ui/Tabs';
import { useCartStore } from '../../stores/cartStore';

export default function CartOptionsModal({ isOpen, onClose }) {
    const cart = useCartStore();
    const [activeTab, setActiveTab] = useState('discount');

    // Local state to manage changes before applying
    const [discountValue, setDiscountValue] = useState(cart.discount);
    const [discountType, setDiscountType] = useState(cart.discountType); // 'fixed' or 'percent'
    const [serviceCharge, setServiceCharge] = useState(cart.serviceCharge);
    const [isTaxExempt, setIsTaxExempt] = useState(cart.taxExempt);

    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            setDiscountValue(cart.discount);
            setDiscountType(cart.discountType);
            setServiceCharge(cart.serviceCharge);
            setIsTaxExempt(cart.taxExempt);
        }
    }, [isOpen, cart]);

    const handleSave = () => {
        cart.setDiscount(parseFloat(discountValue) || 0, discountType);
        cart.setServiceCharge(parseFloat(serviceCharge) || 0);
        cart.setTaxExempt(isTaxExempt);
        onClose();
    };

    const tabs = [
        { id: 'discount', label: 'Discount' },
        { id: 'fees', label: 'Fees' },
        { id: 'tax', label: 'Tax' },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cart Options"
            size="sm"
        >
            <ModalBody>
                <div className="mb-4">
                    <Tabs
                        tabs={tabs}
                        activeTab={activeTab}
                        onChange={setActiveTab}
                    />
                </div>

                <div className="p-1">
                    {activeTab === 'discount' && (
                        <div className="space-y-4">
                            <div className="flex bg-dark-tertiary rounded-lg p-1">
                                <button
                                    onClick={() => setDiscountType('fixed')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${discountType === 'fixed'
                                        ? 'bg-accent-primary text-white'
                                        : 'text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    Fixed Amount ($)
                                </button>
                                <button
                                    onClick={() => setDiscountType('percent')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${discountType === 'percent'
                                        ? 'bg-accent-primary text-white'
                                        : 'text-zinc-400 hover:text-white'
                                        }`}
                                >
                                    Percentage (%)
                                </button>
                            </div>
                            <Input
                                label={discountType === 'fixed' ? 'Discount Amount' : 'Percentage Off'}
                                type="number"
                                min="0"
                                value={discountValue}
                                onChange={(e) => setDiscountValue(e.target.value)}
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    )}

                    {activeTab === 'fees' && (
                        <div className="space-y-4">
                            <Input
                                label="Service Charge / Fee ($)"
                                type="number"
                                min="0"
                                value={serviceCharge}
                                onChange={(e) => setServiceCharge(e.target.value)}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-zinc-500">
                                This amount will be added to the final total.
                            </p>
                        </div>
                    )}

                    {activeTab === 'tax' && (
                        <div className="space-y-4 py-2">
                            <label className="flex items-center gap-3 p-4 bg-dark-tertiary rounded-lg cursor-pointer border border-transparent hover:border-zinc-700">
                                <input
                                    type="checkbox"
                                    checked={isTaxExempt}
                                    onChange={(e) => setIsTaxExempt(e.target.checked)}
                                    className="w-5 h-5 rounded border-zinc-600 bg-dark-bg text-accent-primary focus:ring-accent-primary"
                                />
                                <div>
                                    <span className="block font-medium">Tax Exempt</span>
                                    <span className="text-xs text-zinc-500">Remove tax for this transaction</span>
                                </div>
                            </label>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <div className="flex justify-end gap-2 w-full">
                    <Button variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} className="flex-1">
                        Apply Changes
                    </Button>
                </div>
            </ModalFooter>
        </Modal>
    );
}
