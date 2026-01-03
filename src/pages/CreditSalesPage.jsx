import { useState, useEffect } from 'react';
import { Search, FileText, DollarSign, Mail, Bell, Eye, Filter, Calendar, User, CreditCard, Banknote, X, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import ReceiptPreviewModal from '../components/modals/ReceiptPreviewModal';
import { toast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/authStore';
import { format } from 'date-fns';

export default function CreditSalesPage() {
    const [creditSales, setCreditSales] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedSale, setSelectedSale] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    const { currentEmployee } = useAuthStore();

    useEffect(() => {
        loadData();
    }, [statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter !== 'all') {
                params.status = statusFilter;
            }
            const [salesData, customersData] = await Promise.all([
                window.electronAPI.creditSales.getAll(params),
                window.electronAPI.customers.getAll()
            ]);
            setCreditSales(salesData);
            setCustomers(customersData);
        } catch (error) {
            console.error('Failed to load credit sales:', error);
            toast.error('Failed to load credit sales');
        } finally {
            setLoading(false);
        }
    };

    const [currency, setCurrency] = useState('USD');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await window.electronAPI.settings.getAll();
                let parsed = { ...settings };
                if (settings.store_config) {
                    const config = typeof settings.store_config === 'string'
                        ? JSON.parse(settings.store_config)
                        : settings.store_config;
                    parsed = { ...parsed, ...config };
                }
                if (parsed.currency) setCurrency(parsed.currency);
            } catch (e) { console.error(e); }
        };
        fetchSettings();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'pending': 'bg-amber-500/20 text-amber-400',
            'partial': 'bg-blue-500/20 text-blue-400',
            'paid': 'bg-green-500/20 text-green-400',
            'overdue': 'bg-red-500/20 text-red-400'
        };
        return colors[status] || 'bg-zinc-500/20 text-zinc-400';
    };

    const getStatusLabel = (status) => {
        const labels = {
            'pending': 'Pending',
            'partial': 'Partially Paid',
            'paid': 'Paid',
            'overdue': 'Overdue'
        };
        return labels[status] || status;
    };

    const filteredSales = creditSales.filter(sale => {
        if (!searchQuery) return true;
        const search = searchQuery.toLowerCase();
        return sale.customer_name?.toLowerCase().includes(search) ||
            sale.invoice_number?.toLowerCase().includes(search) ||
            sale.receipt_number?.toLowerCase().includes(search);
    });

    const totalOutstanding = creditSales
        .filter(s => s.status !== 'paid')
        .reduce((sum, s) => sum + ((s.amount_due || 0) - (s.amount_paid || 0)), 0);

    const totalPending = creditSales.filter(s => s.status === 'pending').length;
    const totalPartial = creditSales.filter(s => s.status === 'partial').length;

    const handleSendInvoice = async (sale) => {
        if (!sale.customer_email) {
            toast.error('Customer has no email address');
            return;
        }
        try {
            await window.electronAPI.creditSales.sendInvoice({
                creditSaleId: sale.id,
                email: sale.customer_email
            });
            toast.success('Invoice sent successfully');
        } catch (error) {
            console.error('Failed to send invoice:', error);
            toast.error('Failed to send invoice: ' + error.message);
        }
    };

    const handleSendReminder = async (sale) => {
        if (!sale.customer_email) {
            toast.error('Customer has no email address');
            return;
        }
        try {
            await window.electronAPI.creditSales.sendReminder({
                creditSaleId: sale.id,
                email: sale.customer_email
            });
            toast.success('Reminder sent successfully');
        } catch (error) {
            console.error('Failed to send reminder:', error);
            toast.error('Failed to send reminder: ' + error.message);
        }
    };

    const handleViewDetails = async (sale) => {
        try {
            const details = await window.electronAPI.creditSales.getById(sale.id);
            setSelectedSale(details);
            setShowDetailsModal(true);
        } catch (error) {
            console.error('Failed to load details:', error);
            toast.error('Failed to load sale details');
        }
    };

    const handleRecordPayment = (sale) => {
        setSelectedSale(sale);
        setShowPaymentModal(true);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Credit Sales</h1>
                    <p className="text-zinc-400 text-sm">Manage invoices and record payments</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="card p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-amber-500/20">
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-zinc-400 truncate">Outstanding</p>
                            <p className="text-lg sm:text-xl font-bold text-amber-400">{formatCurrency(totalOutstanding)}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-blue-500/20">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-zinc-400 truncate">Total Invoices</p>
                            <p className="text-lg sm:text-xl font-bold">{creditSales.length}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-amber-500/20">
                            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-zinc-400 truncate">Pending</p>
                            <p className="text-lg sm:text-xl font-bold">{totalPending}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 sm:p-3 rounded-xl bg-blue-500/20">
                            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-zinc-400 truncate">Partial</p>
                            <p className="text-lg sm:text-xl font-bold">{totalPartial}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search by customer, invoice #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {['all', 'pending', 'partial', 'paid', 'overdue'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap flex-shrink-0
                                ${statusFilter === status
                                    ? 'bg-accent-primary text-white'
                                    : 'bg-dark-tertiary text-zinc-400 hover:text-white'
                                }`}
                        >
                            {status === 'all' ? 'All' : getStatusLabel(status)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table - Mobile Card View / Desktop Table */}
            <div className="card overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-border">
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Invoice #</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Customer</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Date</th>
                                <th className="text-left p-4 text-sm font-medium text-zinc-400">Due Date</th>
                                <th className="text-right p-4 text-sm font-medium text-zinc-400">Amount</th>
                                <th className="text-right p-4 text-sm font-medium text-zinc-400">Paid</th>
                                <th className="text-right p-4 text-sm font-medium text-zinc-400">Balance</th>
                                <th className="text-center p-4 text-sm font-medium text-zinc-400">Status</th>
                                <th className="text-right p-4 text-sm font-medium text-zinc-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-12 text-zinc-500">Loading...</td>
                                </tr>
                            ) : filteredSales.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-12 text-zinc-500">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No credit sales found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSales.map(sale => (
                                    <tr key={sale.id} className="border-b border-dark-border hover:bg-dark-tertiary/50">
                                        <td className="p-4">
                                            <span className="font-mono text-sm">{sale.invoice_number}</span>
                                        </td>
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium">{sale.customer_name || 'Unknown'}</p>
                                                <p className="text-xs text-zinc-500">{sale.customer_email || sale.customer_phone}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400">{formatDate(sale.created_at)}</td>
                                        <td className="p-4 text-sm text-zinc-400">{formatDate(sale.due_date)}</td>
                                        <td className="p-4 text-right font-medium">{formatCurrency(sale.amount_due)}</td>
                                        <td className="p-4 text-right text-green-400">{formatCurrency(sale.amount_paid)}</td>
                                        <td className="p-4 text-right font-bold text-amber-400">
                                            {formatCurrency((sale.amount_due || 0) - (sale.amount_paid || 0))}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                                                {getStatusLabel(sale.status)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleViewDetails(sale)}
                                                    className="p-2 hover:bg-dark-tertiary rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {sale.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleRecordPayment(sale)}
                                                        className="p-2 hover:bg-green-500/20 rounded-lg transition-colors text-green-400"
                                                        title="Record Payment"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleSendInvoice(sale)}
                                                    className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-blue-400"
                                                    title="Send Invoice"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                                {sale.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleSendReminder(sale)}
                                                        className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors text-amber-400"
                                                        title="Send Reminder"
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-dark-border">
                    {loading ? (
                        <div className="text-center py-12 text-zinc-500">Loading...</div>
                    ) : filteredSales.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500">
                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No credit sales found</p>
                        </div>
                    ) : (
                        filteredSales.map(sale => (
                            <div key={sale.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-mono text-sm text-zinc-400">{sale.invoice_number}</p>
                                        <p className="font-medium">{sale.customer_name || 'Unknown'}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sale.status)}`}>
                                        {getStatusLabel(sale.status)}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <p className="text-zinc-500 text-xs">Amount</p>
                                        <p className="font-medium">{formatCurrency(sale.amount_due)}</p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs">Paid</p>
                                        <p className="text-green-400">{formatCurrency(sale.amount_paid)}</p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs">Balance</p>
                                        <p className="font-bold text-amber-400">{formatCurrency((sale.amount_due || 0) - (sale.amount_paid || 0))}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-dark-border">
                                    <p className="text-xs text-zinc-500">Due: {formatDate(sale.due_date)}</p>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleViewDetails(sale)} className="p-2 hover:bg-dark-tertiary rounded-lg">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {sale.status !== 'paid' && (
                                            <button onClick={() => handleRecordPayment(sale)} className="p-2 hover:bg-green-500/20 rounded-lg text-green-400">
                                                <DollarSign className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => handleSendInvoice(sale)} className="p-2 hover:bg-blue-500/20 rounded-lg text-blue-400">
                                            <Mail className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Record Payment Modal */}
            <RecordPaymentModal
                isOpen={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedSale(null);
                }}
                creditSale={selectedSale}
                onSuccess={async (paymentId, transactionData) => {
                    loadData();
                    setShowPaymentModal(false);
                    setSelectedSale(null);

                    if (paymentId) {
                        try {
                            const payment = await window.electronAPI.creditPayments.getById(paymentId);
                            // Merge extra data like tendered/change if available
                            setReceiptData({
                                ...payment,
                                type: 'credit_payment',
                                ...transactionData
                            });
                            setShowReceiptModal(true);
                        } catch (error) {
                            console.error('Failed to load receipt:', error);
                            toast.error('Payment recorded but failed to load receipt');
                        }
                    }
                }}
                employeeId={currentEmployee?.id}
            />

            {/* Credit Sale Details Modal */}
            <CreditSaleDetailsModal
                isOpen={showDetailsModal}
                onClose={() => {
                    setShowDetailsModal(false);
                    setSelectedSale(null);
                }}
                creditSale={selectedSale}
            />

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
                isOpen={showReceiptModal}
                onClose={() => {
                    setShowReceiptModal(false);
                    setReceiptData(null);
                }}
                sale={receiptData}
            />
        </div>
    );
}

function RecordPaymentModal({ isOpen, onClose, creditSale, onSuccess, employeeId }) {
    const [amount, setAmount] = useState('');
    const [tenderedAmount, setTenderedAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const rawBalance = (creditSale?.amount_due || 0) - (creditSale?.amount_paid || 0);
    // Fix floating point precision issues (e.g. 0.420000000001) which breaks max validation
    const balance = parseFloat(rawBalance.toFixed(2));

    // Calculate change
    const getChange = () => {
        const payAmount = parseFloat(amount) || 0;
        const tendered = parseFloat(tenderedAmount) || 0;
        if (paymentMethod === 'cash' && tendered > payAmount) {
            return tendered - payAmount;
        }
        return 0;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);

        if (!paymentAmount || paymentAmount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (paymentAmount > balance) {
            toast.error('Payment amount exceeds balance');
            return;
        }

        setLoading(true);
        try {
            const result = await window.electronAPI.creditPayments.create({
                credit_sale_id: creditSale.id,
                amount: paymentAmount,
                payment_method: paymentMethod,
                reference: reference || null,
                received_by: employeeId,
                notes: notes || null
            });

            // Print receipt - REPLACED WITH PREVIEW
            // try {
            //     await window.electronAPI.creditPayments.printReceipt(result.id);
            // } catch (printError) {
            //     console.error('Failed to print receipt:', printError);
            //     toast.error('Payment recorded but failed to print receipt');
            // }

            toast.success('Payment recorded successfully');

            // Calculate extra data for receipt
            const transactionData = {};
            if (paymentMethod === 'cash' && tenderedAmount) {
                transactionData.tendered = parseFloat(tenderedAmount);
                transactionData.change = getChange();
            }

            setAmount('');
            setTenderedAmount('');
            setPaymentMethod('cash');
            setReference('');
            setNotes('');
            onSuccess(result.id, transactionData); // Pass ID and extra data
        } catch (error) {
            console.error('Failed to record payment:', error);
            toast.error('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    if (!creditSale) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="md">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <ModalBody>
                    <div className="space-y-4">
                        {/* Invoice Info */}
                        <div className="p-4 rounded-xl bg-dark-tertiary">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-zinc-400">Invoice</span>
                                <span className="font-mono">{creditSale.invoice_number}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-zinc-400">Customer</span>
                                <span>{creditSale.customer_name}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-dark-border">
                                <span className="font-medium">Balance Due</span>
                                <span className="text-xl font-bold text-amber-400">{formatCurrency(balance)}</span>
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Payment Amount *</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={balance}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setAmount(balance.toFixed(2))}
                                >
                                    Pay All
                                </Button>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Payment Method</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors
                                        ${paymentMethod === 'cash'
                                            ? 'border-accent-primary bg-accent-primary/10'
                                            : 'border-dark-border hover:border-zinc-600'
                                        }`}
                                >
                                    <Banknote className="w-5 h-5" />
                                    Cash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('card')}
                                    className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-colors
                                        ${paymentMethod === 'card'
                                            ? 'border-accent-primary bg-accent-primary/10'
                                            : 'border-dark-border hover:border-zinc-600'
                                        }`}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    Card
                                </button>
                            </div>
                        </div>

                        {/* Tendered Amount (Cash Only) */}
                        {paymentMethod === 'cash' && (
                            <div className="bg-dark-tertiary p-3 rounded-lg border border-dashed border-zinc-700 mb-4">
                                <label className="block text-sm text-zinc-400 mb-2">Amount Tendered</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={amount}
                                    value={tenderedAmount}
                                    onChange={(e) => setTenderedAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="mb-2"
                                />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-400">Change:</span>
                                    <span className="font-bold text-green-400">{formatCurrency(getChange())}</span>
                                </div>
                            </div>
                        )}

                        {/* Reference */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Reference (Optional)</label>
                            <Input
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="Check #, Transaction ID, etc."
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm text-zinc-400 mb-2">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Additional notes..."
                                className="input w-full h-20 resize-none"
                            />
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="success" loading={loading}>
                        <Check className="w-4 h-4" />
                        Record Payment
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

function CreditSaleDetailsModal({ isOpen, onClose, creditSale }) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
        } catch {
            return dateString;
        }
    };

    if (!creditSale) return null;

    const balance = (creditSale.amount_due || 0) - (creditSale.amount_paid || 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Invoice ${creditSale.invoice_number}`} size="lg">
            <ModalBody>
                <div className="space-y-6">
                    {/* Customer & Invoice Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Customer</h3>
                            <div>
                                <p className="font-medium text-lg">{creditSale.customer_name}</p>
                                <p className="text-sm text-zinc-400">{creditSale.customer_email}</p>
                                <p className="text-sm text-zinc-400">{creditSale.customer_phone}</p>
                                {creditSale.customer_address && (
                                    <p className="text-sm text-zinc-400 mt-1">{creditSale.customer_address}</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Invoice Details</h3>
                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Receipt #</span>
                                    <span className="font-mono">{creditSale.receipt_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Created</span>
                                    <span>{formatDate(creditSale.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-400">Due Date</span>
                                    <span>{formatDate(creditSale.due_date)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items */}
                    {creditSale.items && creditSale.items.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Items</h3>
                            <div className="border border-dark-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-dark-tertiary">
                                        <tr>
                                            <th className="text-left p-3">Item</th>
                                            <th className="text-center p-3">Qty</th>
                                            <th className="text-right p-3">Price</th>
                                            <th className="text-right p-3">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creditSale.items.map((item, idx) => (
                                            <tr key={idx} className="border-t border-dark-border">
                                                <td className="p-3">{item.product_name}</td>
                                                <td className="p-3 text-center">{item.quantity}</td>
                                                <td className="p-3 text-right">{formatCurrency(item.unit_price)}</td>
                                                <td className="p-3 text-right font-medium">{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="bg-dark-tertiary rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-zinc-400">Subtotal</span>
                            <span>{formatCurrency(creditSale.subtotal)}</span>
                        </div>
                        {creditSale.tax_amount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Tax</span>
                                <span>{formatCurrency(creditSale.tax_amount)}</span>
                            </div>
                        )}
                        {creditSale.discount_amount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-zinc-400">Discount</span>
                                <span className="text-green-400">-{formatCurrency(creditSale.discount_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-dark-border">
                            <span className="font-medium">Total Due</span>
                            <span className="font-bold">{formatCurrency(creditSale.amount_due)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-green-400">Paid</span>
                            <span className="text-green-400">{formatCurrency(creditSale.amount_paid)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-dark-border">
                            <span className="font-bold">Balance Due</span>
                            <span className="text-xl font-bold text-amber-400">{formatCurrency(balance)}</span>
                        </div>
                    </div>

                    {/* Payment History */}
                    {creditSale.payments && creditSale.payments.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">Payment History</h3>
                            <div className="space-y-2">
                                {creditSale.payments.map((payment, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-dark-tertiary rounded-lg">
                                        <div>
                                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                            <p className="text-xs text-zinc-400">
                                                {payment.payment_method} • {formatDate(payment.created_at)}
                                                {payment.received_by_name && ` • by ${payment.received_by_name}`}
                                            </p>
                                        </div>
                                        <Check className="w-5 h-5 text-green-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose}>
                    Close
                </Button>
            </ModalFooter>
        </Modal>
    );
}
