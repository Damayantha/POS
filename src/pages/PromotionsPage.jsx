import { useState, useEffect } from 'react';
import { Percent, Plus, Search, Edit2, Trash2, Calendar, Tag, DollarSign, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ModalBody } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { toast } from '../components/ui/Toast';
import { v4 as uuid } from 'uuid';
import { useSettingsStore } from '../stores/settingsStore';

const PROMO_TYPES = [
    { value: 'percentage', label: 'Percentage Off', description: 'e.g., 20% off' },
    { value: 'fixed', label: 'Fixed Amount Off', description: 'e.g., $10 off' },
    { value: 'bogo', label: 'Buy One Get One', description: 'Buy X, get Y free/discounted' },
    { value: 'threshold', label: 'Threshold Discount', description: 'Spend $X, get Y% off' },
];

export default function PromotionsPage() {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const { settings, loadSettings } = useSettingsStore();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'percentage',
        value: '',
        min_purchase: '',
        max_discount: '',
        max_uses: '',
        start_date: '',
        end_date: '',
        coupon_code: '',
        auto_apply: true,
        is_active: true,
    });

    useEffect(() => {
        loadPromotions();
        loadSettings();
    }, []);

    const loadPromotions = async () => {
        try {
            const data = await window.electronAPI.promotions.getAll();
            setPromotions(data);
        } catch (error) {
            console.error('Failed to load promotions:', error);
            toast.error('Failed to load promotions');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'percentage',
            value: '',
            min_purchase: '',
            max_discount: '',
            max_uses: '',
            start_date: '',
            end_date: '',
            coupon_code: '',
            auto_apply: true,
            is_active: true,
        });
        setEditingPromo(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        setShowFormModal(true);
    };

    const handleOpenEdit = (promo) => {
        setEditingPromo(promo);
        setFormData({
            name: promo.name,
            description: promo.description || '',
            type: promo.type,
            value: promo.value?.toString() || '',
            min_purchase: promo.min_purchase?.toString() || '',
            max_discount: promo.max_discount?.toString() || '',
            max_uses: promo.max_uses?.toString() || '',
            start_date: promo.start_date ? promo.start_date.split('T')[0] : '',
            end_date: promo.end_date ? promo.end_date.split('T')[0] : '',
            coupon_code: promo.coupon_code || '',
            auto_apply: promo.auto_apply,
            is_active: promo.is_active,
        });
        setShowFormModal(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('Please enter a promotion name');
            return;
        }
        if (!formData.value || parseFloat(formData.value) <= 0) {
            toast.error('Please enter a valid discount value');
            return;
        }

        try {
            const promo = {
                id: editingPromo?.id || uuid(),
                name: formData.name,
                description: formData.description || null,
                type: formData.type,
                value: parseFloat(formData.value),
                min_purchase: formData.min_purchase ? parseFloat(formData.min_purchase) : 0,
                max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                coupon_code: formData.coupon_code || null,
                auto_apply: formData.auto_apply,
                is_active: formData.is_active,
                current_uses: editingPromo?.current_uses || 0,
            };

            if (editingPromo) {
                await window.electronAPI.promotions.update(promo);
                toast.success('Promotion updated successfully');
            } else {
                await window.electronAPI.promotions.create(promo);
                toast.success('Promotion created successfully');
            }

            setShowFormModal(false);
            resetForm();
            loadPromotions();
        } catch (error) {
            toast.error('Failed to save promotion');
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        setDeletingId(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            await window.electronAPI.promotions.delete(deletingId);
            toast.success('Promotion deleted');
            loadPromotions();
        } catch (error) {
            toast.error('Failed to delete promotion');
            console.error(error);
        }
        setDeletingId(null);
    };

    const handleToggleActive = async (promo) => {
        try {
            await window.electronAPI.promotions.update({
                ...promo,
                is_active: !promo.is_active,
            });
            toast.success(promo.is_active ? 'Promotion deactivated' : 'Promotion activated');
            loadPromotions();
        } catch (error) {
            toast.error('Failed to update promotion');
            console.error(error);
        }
    };

    const isPromoActive = (promo) => {
        if (!promo.is_active) return false;
        const now = new Date();
        if (promo.start_date && new Date(promo.start_date) > now) return false;
        if (promo.end_date && new Date(promo.end_date) < now) return false;
        if (promo.max_uses && promo.current_uses >= promo.max_uses) return false;
        return true;
    };

    const filteredPromos = promotions.filter(promo =>
        promo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (promo.coupon_code && promo.coupon_code.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const formatCurrency = (amount) => {
        return amount ? new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency || 'USD' }).format(amount) : '-';
    };
    const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '-';

    const getPromoValueDisplay = (promo) => {
        switch (promo.type) {
            case 'percentage':
                return `${promo.value}% off`;
            case 'fixed':
                return `${settings.currencySymbol || '$'}${promo.value} off`;
            case 'bogo':
                return `Buy One Get One`;
            case 'threshold':
                return `${promo.value}% off (min ${settings.currencySymbol || '$'}${promo.min_purchase || 0})`;
            default:
                return promo.value;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'percentage': return 'bg-indigo-500/20 text-indigo-400';
            case 'fixed': return 'bg-green-500/20 text-green-400';
            case 'bogo': return 'bg-purple-500/20 text-purple-400';
            case 'threshold': return 'bg-amber-500/20 text-amber-400';
            default: return 'bg-zinc-500/20 text-zinc-400';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-6 gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Percent className="w-7 h-7 text-amber-500" />
                        Promotions & Discounts
                    </h1>
                    <p className="text-zinc-400 mt-1">Create and manage promotional offers</p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="w-4 h-4" />
                    Create Promotion
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Tag className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{promotions.length}</p>
                        <p className="text-zinc-400 text-sm">Total Promotions</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Percent className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{promotions.filter(p => isPromoActive(p)).length}</p>
                        <p className="text-zinc-400 text-sm">Active Now</p>
                    </div>
                </div>
                <div className="card flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{promotions.reduce((sum, p) => sum + (p.current_uses || 0), 0)}</p>
                        <p className="text-zinc-400 text-sm">Total Uses</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="max-w-md">
                <Input
                    icon={Search}
                    placeholder="Search by name or coupon code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Promotions Grid */}
            <div className="flex-1 overflow-auto">
                {filteredPromos.length === 0 ? (
                    <div className="text-center py-12 text-zinc-400">
                        <Percent className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No promotions found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPromos.map(promo => (
                            <div key={promo.id} className={`card p-5 ${!isPromoActive(promo) ? 'opacity-60' : ''}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">{promo.name}</h3>
                                        <div className="flex gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(promo.type)}`}>
                                                {promo.type}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${isPromoActive(promo) ? 'bg-green-500/20 text-green-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                                                {isPromoActive(promo) ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleOpenEdit(promo)}
                                            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 text-zinc-400" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(promo.id)}
                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Value Display */}
                                <div className="text-2xl font-bold text-amber-400 mb-3">
                                    {getPromoValueDisplay(promo)}
                                </div>

                                {promo.description && (
                                    <p className="text-sm text-zinc-400 mb-3">{promo.description}</p>
                                )}

                                {/* Details */}
                                <div className="space-y-2 text-sm text-zinc-400">
                                    {promo.coupon_code && (
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4" />
                                            <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded">{promo.coupon_code}</span>
                                        </div>
                                    )}
                                    {(promo.start_date || promo.end_date) && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(promo.start_date)} - {formatDate(promo.end_date)}</span>
                                        </div>
                                    )}
                                    {promo.min_purchase > 0 && (
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="w-4 h-4" />
                                            <span>Min. purchase: {formatCurrency(promo.min_purchase)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Usage */}
                                <div className="mt-4 pt-3 border-t border-zinc-700 flex justify-between text-sm">
                                    <span className="text-zinc-500">Uses: {promo.current_uses || 0}{promo.max_uses ? ` / ${promo.max_uses}` : ''}</span>
                                    <button
                                        onClick={() => handleToggleActive(promo)}
                                        className={`text-xs px-2 py-1 rounded ${promo.is_active ? 'text-red-400 hover:bg-red-500/20' : 'text-green-400 hover:bg-green-500/20'}`}
                                    >
                                        {promo.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form Modal */}
            {showFormModal && (
                <Modal
                    isOpen={true}
                    title={editingPromo ? 'Edit Promotion' : 'Create Promotion'}
                    onClose={() => { setShowFormModal(false); resetForm(); }}
                    size="lg"
                >
                    <ModalBody>
                        <div className="space-y-4 max-h-[70vh] overflow-auto">
                            <Input
                                label="Promotion Name"
                                placeholder="e.g., Summer Sale 20% Off"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />

                            <Input
                                label="Description (optional)"
                                placeholder="Promotion description..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />

                            {/* Promotion Type */}
                            <div className="form-group">
                                <label className="form-label">Promotion Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {PROMO_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: type.value })}
                                            className={`p-3 rounded-lg border text-left transition-all ${formData.type === type.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-600'}`}
                                        >
                                            <p className="font-medium text-sm">{type.label}</p>
                                            <p className="text-xs text-zinc-500">{type.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label={formData.type === 'fixed' ? 'Discount Amount ($)' : 'Discount Percentage (%)'}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={formData.type === 'fixed' ? '10.00' : '20'}
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                />
                                <Input
                                    label="Minimum Purchase ($)"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={formData.min_purchase}
                                    onChange={(e) => setFormData({ ...formData, min_purchase: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Max Discount ($) - optional"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="No limit"
                                    value={formData.max_discount}
                                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                                />
                                <Input
                                    label="Max Uses - optional"
                                    type="number"
                                    min="0"
                                    placeholder="Unlimited"
                                    value={formData.max_uses}
                                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Start Date (optional)"
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                                <Input
                                    label="End Date (optional)"
                                    type="date"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>

                            <Input
                                label="Coupon Code (optional)"
                                placeholder="e.g., SUMMER20"
                                value={formData.coupon_code}
                                onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                            />

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="auto_apply"
                                        checked={formData.auto_apply}
                                        onChange={(e) => setFormData({ ...formData, auto_apply: e.target.checked })}
                                        className="w-4 h-4 rounded border-zinc-600 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="auto_apply" className="text-sm text-zinc-300">Auto-apply at checkout</label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded border-zinc-600 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-zinc-300">Active</label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button variant="secondary" className="flex-1" onClick={() => { setShowFormModal(false); resetForm(); }}>
                                    Cancel
                                </Button>
                                <Button className="flex-1" onClick={handleSave}>
                                    {editingPromo ? 'Update' : 'Create'} Promotion
                                </Button>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
                onConfirm={confirmDelete}
                title="Delete Promotion"
                message="Are you sure you want to delete this promotion? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
