import { useState, useEffect } from 'react';
import {
    Plus,
    FileText,
    Calendar,
    CheckCircle,
    User,
    Package,
    Mail
} from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import CreatePurchaseOrderModal from '../components/modals/CreatePurchaseOrderModal';
import RecordSupplierPaymentModal from '../components/modals/RecordSupplierPaymentModal';
import CreatePurchaseReturnModal from '../components/modals/CreatePurchaseReturnModal';
import ReceiveStockModal from '../components/modals/ReceiveStockModal';
import AddSupplierInvoiceModal from '../components/modals/AddSupplierInvoiceModal';
import SmartReorderModal from '../components/modals/SmartReorderModal';
import SupplierReportsModal from '../components/modals/SupplierReportsModal';
import PurchaseOrderDetailsModal from '../components/modals/PurchaseOrderDetailsModal';
import { RefreshCcw, CreditCard, Trash2, Zap, BarChart3, Eye } from 'lucide-react';

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showReorderModal, setShowReorderModal] = useState(false);
    const [showReportsModal, setShowReportsModal] = useState(false);

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [emailPO, setEmailPO] = useState(null);
    const [emailAddress, setEmailAddress] = useState('');
    const { settings, loadSettings } = useSettingsStore();

    useEffect(() => {
        fetchOrders();
        loadSettings();
    }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const data = await window.electronAPI.purchaseOrders.getAll();
            setOrders(data);
        } catch (error) {
            console.error('Failed to fetch POs:', error);
            toast.error('Failed to load purchase orders');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency || 'USD' }).format(amount || 0);
    };

    const handleDelete = async (poId) => {
        if (!confirm('Are you sure you want to delete this purchase order? This cannot be undone.')) return;
        try {
            await window.electronAPI.purchaseOrders.delete(poId);
            toast.success('Purchase Order deleted');
            fetchOrders();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to delete PO');
        }
    };

    const handleReceiveStock = (poId) => {
        const po = orders.find(o => o.id === poId);
        if (po) {
            setSelectedPO(po);
            setShowReceiveModal(true);
        }
    };

    const handleViewDetails = (po) => {
        setSelectedPO(po);
        setShowDetailsModal(true);
    };

    const handleEmailClick = (po) => {
        setEmailPO(po);
        setEmailAddress(po.supplier_email || '');
        setShowEmailModal(true);
    };

    const handlePayClick = (po) => {
        setSelectedPO(po);
        setShowPayModal(true);
    };

    const handleReturnClick = (po) => {
        setSelectedPO(po);
        setShowReturnModal(true);
    };

    const handleSendEmail = async () => {
        if (!emailAddress) {
            toast.error('Please enter an email address');
            return;
        }
        setShowEmailModal(false);
        toast.info('Sending email...');
        try {
            await window.electronAPI.email.sendPurchaseOrder({ to: emailAddress, po: emailPO });
            toast.success('Email sent successfully');
        } catch (error) {
            console.error('Email error:', error);
            toast.error('Failed to send email');
        }
    };

    const handleSavePdf = async (po) => {
        toast.info('Generating PDF...');
        try {
            const pdfPath = await window.electronAPI.purchaseOrders.savePdf(po);
            if (pdfPath) {
                toast.success('PDF saved successfully');
            }
        } catch (error) {
            console.error('PDF error:', error);
            toast.error('Failed to generate PDF');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-6 border-b border-dark-border flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Purchase Orders</h1>
                    <p className="text-zinc-400">Manage supplier orders and incoming stock</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => setShowReportsModal(true)} variant="secondary" className="border-blue-500/20 text-blue-500 hover:bg-blue-500/10">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        Reports
                    </Button>
                    <Button onClick={() => setShowReorderModal(true)} variant="secondary" className="border-amber-500/20 text-amber-500 hover:bg-amber-500/10">
                        <Zap className="w-5 h-5 mr-2" />
                        Smart Reorder
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-5 h-5 mr-2" />
                        New Order
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                    {orders.map(po => (
                        <Card key={po.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${po.status === 'received' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                                    }`}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{po.supplier_name || 'Unknown Supplier'}</h3>
                                    <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-zinc-400">
                                        <span className="flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            #{po.po_number || po.id.slice(0, 8)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(po.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                    <div className="text-left sm:text-right">
                                        <p className="text-sm text-zinc-400">Total Amount</p>
                                        <p className="font-bold text-lg">{formatCurrency(po.total)}</p>
                                        {po.amount_paid > 0 && (
                                            <p className="text-xs text-green-400">Paid: {formatCurrency(po.amount_paid)}</p>
                                        )}
                                        {po.total - (po.amount_paid || 0) > 0.01 && (
                                            <p className="text-xs text-red-400 font-semibold">
                                                Due: {formatCurrency(po.total - (po.amount_paid || 0))}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1 items-end">
                                        <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${po.status === 'received' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                                            }`}>
                                            {po.status}
                                        </div>
                                        {po.payment_status && (
                                            <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${po.payment_status === 'paid' ? 'border-green-500/30 text-green-500' :
                                                po.payment_status === 'partial' ? 'border-amber-500/30 text-amber-500' :
                                                    'border-red-500/30 text-red-500'
                                                }`}>
                                                {po.payment_status}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                    {/* Delete Button - only if not received and no payments */}
                                    {po.status !== 'received' && (!po.amount_paid || po.amount_paid === 0) && (
                                        <Button size="sm" variant="ghost" onClick={() => handleDelete(po.id)} title="Delete Order">
                                            <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                                        </Button>
                                    )}

                                    <Button size="sm" variant="outline" onClick={() => handleSavePdf(po)} title="Save PDF">
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleEmailClick(po)} title="Email PO">
                                        <Mail className="w-4 h-4" />
                                    </Button>

                                    {/* View Details */}
                                    <Button size="sm" variant="outline" onClick={() => handleViewDetails(po)} title="View Details">
                                        <Eye className="w-4 h-4" />
                                    </Button>

                                    {/* Pay Button - if not fully paid */}
                                    {po.payment_status !== 'paid' && (
                                        <Button size="sm" variant="secondary" onClick={() => handlePayClick(po)} title="Record Payment">
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Pay
                                        </Button>
                                    )}

                                    {/* Return Button - if received */}
                                    {po.status === 'received' && (
                                        <Button size="sm" variant="secondary" onClick={() => handleReturnClick(po)} title="Return Items">
                                            <RefreshCcw className="w-4 h-4 mr-2" />
                                            Return
                                        </Button>
                                    )}

                                    {po.status !== 'received' && (
                                        <Button size="sm" onClick={() => handleReceiveStock(po.id)}>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Receive
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}

                    {orders.length === 0 && !isLoading && (
                        <div className="text-center py-12 text-zinc-500">
                            <p>No purchase orders found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Order Modal */}
            <CreatePurchaseOrderModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onComplete={() => {
                    fetchOrders();
                    setShowCreateModal(false);
                }}
            />

            {/* Email Modal */}
            <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Send Purchase Order">
                <ModalBody>
                    <div className="space-y-4">
                        <p className="text-zinc-400">Send this purchase order to the supplier via email.</p>
                        <Input
                            label="Supplier Email"
                            type="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="supplier@example.com"
                        />
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setShowEmailModal(false)}>Cancel</Button>
                    <Button onClick={handleSendEmail}>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Payment Modal */}
            <RecordSupplierPaymentModal
                isOpen={showPayModal}
                onClose={() => setShowPayModal(false)}
                onComplete={() => {
                    fetchOrders();
                    setShowPayModal(false);
                }}
                purchaseOrder={selectedPO}
            />

            {/* Return Modal */}
            <CreatePurchaseReturnModal
                isOpen={showReturnModal}
                onClose={() => setShowReturnModal(false)}
                onComplete={() => {
                    toast.success('Return Processed');
                    fetchOrders();
                    setShowReturnModal(false);
                }}
                purchaseOrder={selectedPO}
            />

            {/* Receive Stock Modal (GRN) */}
            <ReceiveStockModal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                onComplete={() => {
                    fetchOrders();
                    setShowReceiveModal(false);
                }}
                purchaseOrder={selectedPO}
            />

            {/* Add Invoice Modal (Phase 3) */}
            <AddSupplierInvoiceModal
                isOpen={showInvoiceModal}
                onClose={() => setShowInvoiceModal(false)}
                onComplete={() => {
                    fetchOrders();
                    setShowInvoiceModal(false);
                }}
                purchaseOrder={selectedPO}
            />

            {/* Smart Reorder Modal (Phase 4) */}
            <SmartReorderModal
                isOpen={showReorderModal}
                onClose={() => setShowReorderModal(false)}
                onComplete={() => {
                    fetchOrders();
                    setShowReorderModal(false);
                }}
            />

            {/* Reports Modal (Phase 4) */}
            <SupplierReportsModal
                isOpen={showReportsModal}
                onClose={() => setShowReportsModal(false)}
            />

            <PurchaseOrderDetailsModal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                purchaseOrder={selectedPO}
            />
        </div>
    );
}
