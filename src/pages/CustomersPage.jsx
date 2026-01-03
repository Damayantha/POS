import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Star, ShoppingBag, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, SearchInput, TextArea } from '../components/ui/Input';
import { Modal, ModalBody, ModalFooter } from '../components/ui/Modal';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeader, EmptyState } from '../components/ui/Table';
import { Card, StatCard } from '../components/ui/Card';
import { toast } from '../components/ui/Toast';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import { ExcelImport } from '../components/ui/ExcelImport';
import { FileSpreadsheet } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSales, setCustomerSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const { settings, loadSettings } = useSettingsStore();

    useEffect(() => {
        loadData();
        loadSettings();
    }, []);

    const loadData = async () => {
        try {
            const data = await window.electronAPI.customers.getAll();
            setCustomers(data);
        } catch (error) {
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCustomers = customers.length;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
    const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency || 'USD' }).format(amount);
    };

    const handleDelete = async (customer) => {
        if (confirm(`Delete customer "${customer.name}"?`)) {
            try {
                await window.electronAPI.customers.delete(customer.id);
                toast.success('Customer deleted');
                loadData();
            } catch (error) {
                toast.error('Failed to delete customer');
            }
        }
    };

    const handleExcelImport = async (records) => {
        let successCount = 0;
        for (const record of records) {
            try {
                await window.electronAPI.customers.create({
                    id: uuid(),
                    name: record.name,
                    email: record.email || null,
                    phone: record.phone || null,
                    address: record.address || null,
                    notes: record.notes || null,
                    loyalty_points: parseInt(record.loyalty_points) || 0,
                    total_spent: parseFloat(record.total_spent) || 0,
                });
                successCount++;
            } catch (error) {
                console.error('Failed to import customer:', record.name, error);
            }
        }
        toast.success(`Imported ${successCount} customers`);
        loadData();
    };

    const handleViewDetails = async (customer) => {
        setSelectedCustomer(customer);
        // In a real app, you'd fetch customer's purchase history here
        setShowDetailsModal(true);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-dark-border">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Customers</h1>
                        <p className="text-zinc-500">Manage your customer database</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                            <FileSpreadsheet className="w-4 h-4" />
                            Import Excel
                        </Button>
                        <Button onClick={() => { setEditingCustomer(null); setShowModal(true); }}>
                            <Plus className="w-4 h-4" />
                            Add Customer
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <StatCard
                        label="Total Customers"
                        value={totalCustomers}
                        icon={Users}
                        color="primary"
                    />
                    <StatCard
                        label="Total Loyalty Points"
                        value={totalLoyaltyPoints.toLocaleString()}
                        icon={Star}
                        color="warning"
                    />
                    <StatCard
                        label="Total Spent"
                        value={formatCurrency(totalSpent)}
                        icon={ShoppingBag}
                        color="success"
                    />
                </div>

                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search customers..."
                    className="max-w-md"
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No customers found"
                        description={searchQuery ? 'Try a different search term' : 'Add your first customer to get started'}
                        action={
                            <Button onClick={() => { setEditingCustomer(null); setShowModal(true); }}>
                                <Plus className="w-4 h-4" />
                                Add Customer
                            </Button>
                        }
                    />
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Customer</TableHeader>
                                <TableHeader>Contact</TableHeader>
                                <TableHeader>Loyalty Points</TableHeader>
                                <TableHeader>Total Spent</TableHeader>
                                <TableHeader>Joined</TableHeader>
                                <TableHeader>Actions</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCustomers.map(customer => (
                                <TableRow
                                    key={customer.id}
                                    onClick={() => handleViewDetails(customer)}
                                    className="cursor-pointer"
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center">
                                                <span className="font-semibold text-accent-primary">
                                                    {customer.name.charAt(0)}
                                                </span>
                                            </div>
                                            <span className="font-medium">{customer.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {customer.phone && (
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Phone className="w-3 h-3" />
                                                    {customer.phone}
                                                </div>
                                            )}
                                            {customer.email && (
                                                <div className="flex items-center gap-2 text-sm text-zinc-400">
                                                    <Mail className="w-3 h-3" />
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-amber-400">
                                            <Star className="w-4 h-4" />
                                            {customer.loyalty_points || 0}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-green-400">
                                        {formatCurrency(customer.total_spent || 0)}
                                    </TableCell>
                                    <TableCell className="text-zinc-400">
                                        {format(new Date(customer.created_at), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => { setEditingCustomer(customer); setShowModal(true); }}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(customer)}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Customer Form Modal */}
            <CustomerFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                customer={editingCustomer}
                onSave={() => { loadData(); setShowModal(false); }}
            />

            {/* Excel Import Modal */}
            <ExcelImport
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                dataType="customers"
                onImport={handleExcelImport}
                title="Import Customers"
            />

            {/* Customer Details Modal */}
            <Modal
                isOpen={showDetailsModal}
                onClose={() => setShowDetailsModal(false)}
                title="Customer Details"
                size="lg"
            >
                <ModalBody>
                    {selectedCustomer && (
                        <div className="space-y-6">
                            {/* Customer Info */}
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-accent-primary">
                                        {selectedCustomer.name.charAt(0)}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                                        {selectedCustomer.phone && (
                                            <span className="flex items-center gap-1">
                                                <Phone className="w-4 h-4" />
                                                {selectedCustomer.phone}
                                            </span>
                                        )}
                                        {selectedCustomer.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-4 h-4" />
                                                {selectedCustomer.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-lg bg-dark-tertiary text-center">
                                    <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                                        <Star className="w-5 h-5" />
                                    </div>
                                    <p className="text-2xl font-bold">{selectedCustomer.loyalty_points || 0}</p>
                                    <p className="text-sm text-zinc-400">Loyalty Points</p>
                                </div>
                                <div className="p-4 rounded-lg bg-dark-tertiary text-center">
                                    <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                                        <ShoppingBag className="w-5 h-5" />
                                    </div>
                                    <p className="text-2xl font-bold">{formatCurrency(selectedCustomer.total_spent || 0)}</p>
                                    <p className="text-sm text-zinc-400">Total Spent</p>
                                </div>
                                <div className="p-4 rounded-lg bg-dark-tertiary text-center">
                                    <p className="text-2xl font-bold">
                                        {format(new Date(selectedCustomer.created_at), 'MMM yyyy')}
                                    </p>
                                    <p className="text-sm text-zinc-400">Member Since</p>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedCustomer.notes && (
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Notes</h4>
                                    <p className="p-3 rounded-lg bg-dark-tertiary">{selectedCustomer.notes}</p>
                                </div>
                            )}

                            {/* Address */}
                            {selectedCustomer.address && (
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Address</h4>
                                    <p className="p-3 rounded-lg bg-dark-tertiary">{selectedCustomer.address}</p>
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                        Close
                    </Button>
                    <Button onClick={() => {
                        setEditingCustomer(selectedCustomer);
                        setShowDetailsModal(false);
                        setShowModal(true);
                    }}>
                        <Edit2 className="w-4 h-4" />
                        Edit Customer
                    </Button>
                </ModalFooter>
            </Modal>
        </div >
    );
}

function CustomerFormModal({ isOpen, onClose, customer, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        credit_enabled: false,
        credit_limit: 0,
    });
    const [loading, setLoading] = useState(false);
    const { settings } = useSettingsStore();

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name,
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                notes: customer.notes || '',
                credit_enabled: !!customer.credit_enabled,
                credit_limit: customer.credit_limit || 0,
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                address: '',
                notes: '',
                credit_enabled: false,
                credit_limit: 0,
            });
        }
    }, [customer, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('Name is required');
            return;
        }

        setLoading(true);
        try {
            const data = {
                ...formData,
                id: customer?.id || uuid(),
                loyalty_points: customer?.loyalty_points || 0,
                total_spent: customer?.total_spent || 0,
                credit_enabled: formData.credit_enabled ? 1 : 0,
                credit_limit: parseFloat(formData.credit_limit) || 0,
                credit_balance: customer?.credit_balance || 0,
            };

            if (customer) {
                await window.electronAPI.customers.update(data);
                toast.success('Customer updated');
            } else {
                await window.electronAPI.customers.create(data);
                toast.success('Customer created');
            }
            onSave();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={customer ? 'Edit Customer' : 'Add Customer'} size="md">
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <ModalBody>
                    <div className="space-y-4">
                        <Input
                            label="Name *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Customer name"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="email@example.com"
                        />
                        <Input
                            label="Phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone number"
                        />
                        <TextArea
                            label="Address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Customer address"
                        />
                        <TextArea
                            label="Notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Additional notes"
                        />

                        {/* Credit Settings Section */}
                        <div className="pt-4 border-t border-dark-border">
                            <h4 className="text-sm font-medium text-zinc-400 mb-3">Credit Settings</h4>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.credit_enabled}
                                        onChange={(e) => setFormData({ ...formData, credit_enabled: e.target.checked })}
                                        className="w-5 h-5 rounded border-dark-border bg-dark-tertiary accent-accent-primary"
                                    />
                                    <span>Enable credit for this customer</span>
                                </label>

                                {formData.credit_enabled && (
                                    <Input
                                        label={`Credit Limit (${settings.currencySymbol || '$'})`}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.credit_limit}
                                        onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                                        placeholder="0.00"
                                    />
                                )}

                                {customer && customer.credit_balance > 0 && (
                                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                        <p className="text-sm text-amber-400">
                                            Current Credit Balance: <span className="font-bold">{settings.currencySymbol || '$'}{parseFloat(customer.credit_balance || 0).toFixed(2)}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={loading}>
                        {customer ? 'Update Customer' : 'Add Customer'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

