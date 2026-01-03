import { useState, useEffect } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, FileText, Mail } from 'lucide-react';
import { toast } from '../ui/Toast';

export default function PurchaseOrderDetailsModal({ isOpen, onClose, purchaseOrder }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (purchaseOrder && isOpen) {
            fetchDetails();
        }
    }, [purchaseOrder, isOpen]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.purchaseOrders.getById(purchaseOrder.id);
            setDetails(data);
        } catch (error) {
            console.error('Failed to load PO details:', error);
            toast.error('Failed to load PO details');
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!details?.supplier_email) {
            toast.error('Supplier has no email address');
            return;
        }

        setSending(true);
        try {
            await window.electronAPI.email.sendPurchaseOrder({
                to: details.supplier_email,
                po: details
            });
            toast.success('Purchase Order emailed successfully');
        } catch (error) {
            console.error('Email failed:', error);
            toast.error('Failed to send email');
        } finally {
            setSending(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Purchase Order #${purchaseOrder?.po_number}`} size="lg">
            <ModalBody>
                {loading ? (
                    <div className="p-8 text-center text-zinc-500">Loading details...</div>
                ) : details ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Supplier</p>
                                <p className="font-medium">{details.supplier_name || 'Unknown'}</p>
                                {details.supplier_email && <p className="text-xs text-zinc-500">{details.supplier_email}</p>}
                                {details.supplier_phone && <p className="text-xs text-zinc-500">{details.supplier_phone}</p>}
                            </div>
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Status</p>
                                <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${details.status === 'received' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                                        }`}>
                                        {details.status}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase border ${details.payment_status === 'paid' ? 'border-green-500/30 text-green-500' :
                                            details.payment_status === 'partial' ? 'border-amber-500/30 text-amber-500' :
                                                'border-red-500/30 text-red-500'
                                        }`}>
                                        {details.payment_status}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Date Created</p>
                                <p className="font-medium">{formatDate(details.created_at)}</p>
                            </div>
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Expected Date</p>
                                <p className="font-medium">{details.expected_date ? new Date(details.expected_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="border border-dark-border rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-dark-tertiary text-zinc-400">
                                    <tr>
                                        <th className="p-3">Product</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3 text-right">Unit Cost</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border">
                                    {details.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-medium">
                                                {item.product_name}
                                                <div className="text-xs text-zinc-500">{item.sku}</div>
                                            </td>
                                            <td className="p-3 text-center">{item.quantity}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.unit_cost)}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.total_cost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-dark-tertiary font-bold">
                                    <tr>
                                        <td colSpan="3" className="p-3 text-right font-normal text-zinc-400">Subtotal</td>
                                        <td className="p-3 text-right">{formatCurrency(details.subtotal)}</td>
                                    </tr>
                                    {details.tax_amount > 0 && (
                                        <tr>
                                            <td colSpan="3" className="p-3 text-right font-normal text-zinc-400">Tax</td>
                                            <td className="p-3 text-right">{formatCurrency(details.tax_amount)}</td>
                                        </tr>
                                    )}
                                    {details.shipping_cost > 0 && (
                                        <tr>
                                            <td colSpan="3" className="p-3 text-right font-normal text-zinc-400">Shipping</td>
                                            <td className="p-3 text-right">{formatCurrency(details.shipping_cost)}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td colSpan="3" className="p-3 text-right">Total</td>
                                        <td className="p-3 text-right text-accent-primary">{formatCurrency(details.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {details.notes && (
                            <div className="p-3 bg-dark-tertiary rounded-lg text-sm">
                                <p className="text-zinc-400 mb-1">Notes</p>
                                <p>{details.notes}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 mt-4">
                            {details.supplier_email && (
                                <Button size="sm" variant="outline" onClick={handleSendEmail} loading={sending}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Email Supplier
                                </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => window.electronAPI.purchaseOrders.savePdf(details)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-zinc-500">Failed to load details</div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </ModalFooter>
        </Modal>
    );
}
