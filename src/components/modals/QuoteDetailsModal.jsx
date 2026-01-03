import { useState, useEffect } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Mail, Printer, FileText } from 'lucide-react';
import { toast } from '../ui/Toast';

export default function QuoteDetailsModal({ isOpen, onClose, quote }) {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (quote && isOpen) {
            fetchDetails();
            // Pre-fill email if customer info available in quote object (if we had it)
            // But we might need to rely on details fetch
        }
    }, [quote, isOpen]);

    useEffect(() => {
        if (details?.customer_email) {
            setEmail(details.customer_email);
        }
    }, [details]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.quotations.getById(quote.id);
            // Fetch customer email if not in details
            if (data.customer_id) {
                const customer = await window.electronAPI.customers.getById(data.customer_id);
                if (customer?.email) {
                    data.customer_email = customer.email;
                }
            }
            setDetails(data);
        } catch (error) {
            console.error('Failed to load quote details:', error);
            toast.error('Failed to load quote details');
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmail = async () => {
        if (!email) {
            toast.error('Please enter an email address');
            return;
        }

        setSending(true);
        try {
            const result = await window.electronAPI.email.sendQuotation({
                to: email,
                quote: details
            });

            if (result.success) {
                toast.success('Quotation emailed successfully');
                // Optional: onClose(); 
            } else {
                toast.error(result.message || 'Failed to send email');
            }
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
        <Modal isOpen={isOpen} onClose={onClose} title={`Quotation #${quote?.quote_number}`} size="lg">
            <ModalBody>
                {loading ? (
                    <div className="p-8 text-center text-zinc-500">Loading details...</div>
                ) : details ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Customer</p>
                                <p className="font-medium">{details.customer_name || 'Walk-in'}</p>
                                {details.customer_email && <p className="text-xs text-zinc-500">{details.customer_email}</p>}
                            </div>
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Created By</p>
                                <p className="font-medium">{details.employee_name || 'Unknown'}</p>
                            </div>
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Date</p>
                                <p className="font-medium">{formatDate(details.created_at)}</p>
                            </div>
                            <div className="p-3 bg-dark-tertiary rounded-lg">
                                <p className="text-zinc-400">Status</p>
                                <p className="font-medium uppercase">{details.status}</p>
                            </div>
                        </div>

                        {/* Items */}
                        <div className="border border-dark-border rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-dark-tertiary text-zinc-400">
                                    <tr>
                                        <th className="p-3">Product</th>
                                        <th className="p-3 text-center">Qty</th>
                                        <th className="p-3 text-right">Price</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border">
                                    {details.items?.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="p-3 font-medium">{item.product_name}</td>
                                            <td className="p-3 text-center">{item.quantity}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                                            <td className="p-3 text-right">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-dark-tertiary font-bold">
                                    <tr>
                                        <td colSpan="3" className="p-3 text-right">Total</td>
                                        <td className="p-3 text-right text-accent-primary">{formatCurrency(details.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Actions */}
                        <div className="bg-dark-tertiary/50 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                            <div className="w-full md:w-auto flex-1">
                                <label className="block text-xs text-zinc-400 mb-1">Email Customer</label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="customer@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                    <Button size="sm" onClick={handleSendEmail} loading={sending}>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send
                                    </Button>
                                </div>
                            </div>
                            <Button variant="secondary" size="sm" onClick={() => window.electronAPI.quotations.print(details)}>
                                <Printer className="w-4 h-4 mr-2" />
                                Print
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-zinc-500">Failed to load details</div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="outline" onClick={() => window.electronAPI.quotations.savePdf(details)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Save PDF
                </Button>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </ModalFooter>
        </Modal>
    );
}
