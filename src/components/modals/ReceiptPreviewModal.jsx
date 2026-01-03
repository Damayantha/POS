import { useState, useEffect } from 'react';
import { Modal, ModalBody } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from '../ui/Toast';
import { Printer, Mail, Download } from 'lucide-react';

export default function ReceiptPreviewModal({ isOpen, onClose, sale }) {
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && sale) {
            loadHtml();
        } else {
            setHtml('');
        }
    }, [isOpen, sale]);

    const loadHtml = async () => {
        setLoading(true);
        try {
            const content = await window.electronAPI.receipts.getHtml(sale);
            setHtml(content);
        } catch (error) {
            console.error('Failed to load receipt:', error);
            toast.error('Failed to load receipt preview');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        setPrinting(true);
        try {
            await window.electronAPI.receipts.print(sale);
            toast.success('Sent to printer');
        } catch (error) {
            console.error('Print failed:', error);
            toast.error('Failed to print');
        } finally {
            setPrinting(false);
        }
    };

    const handleEmail = async () => {
        if (!email) {
            toast.error('Please enter an email address');
            return;
        }
        setSendingEmail(true);
        try {
            await window.electronAPI.email.sendReceipt(sale, email);
            toast.success(`Receipt sent to ${email}`);
        } catch (error) {
            console.error('Email failed:', error);
            toast.error(error.message || 'Failed to send email');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleSavePdf = async () => {
        setSaving(true);
        try {
            const path = await window.electronAPI.receipts.savePdf(sale);
            if (path) {
                toast.success('Receipt saved as PDF');
            }
        } catch (error) {
            console.error('Save PDF failed:', error);
            toast.error('Failed to save PDF');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Receipt Preview" size="lg">
            <ModalBody>
                <div className="grid grid-cols-2 gap-6 h-[500px]">
                    {/* Preview Section - Using iframe to isolate styles */}
                    <div className="border border-dark-border rounded-lg bg-white overflow-hidden h-full">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-black">
                                Loading preview...
                            </div>
                        ) : html ? (
                            <iframe
                                title="Receipt Preview"
                                src={`data:text/html;charset=utf-8,${encodeURIComponent(html)}`}
                                className="w-full h-full border-0"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-red-500">
                                Failed to load preview
                            </div>
                        )}
                    </div>

                    {/* Actions Section */}
                    <div className="flex flex-col gap-4">
                        <div className="p-4 rounded-lg bg-dark-tertiary">
                            <h3 className="font-semibold mb-2">Actions</h3>
                            <Button
                                onClick={handlePrint}
                                loading={printing}
                                className="w-full justify-start mb-2"
                                size="lg"
                            >
                                <Printer className="w-5 h-5 mr-2" />
                                Print Receipt
                            </Button>
                            <Button
                                onClick={handleSavePdf}
                                loading={saving}
                                className="w-full justify-start"
                                variant="outline"
                                size="lg"
                            >
                                <Download className="w-5 h-5 mr-2" />
                                Save as PDF
                            </Button>
                        </div>

                        <div className="p-4 rounded-lg bg-dark-tertiary flex-1">
                            <h3 className="font-semibold mb-2">Email Receipt</h3>
                            <div className="space-y-3">
                                <Input
                                    label="Customer Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="customer@example.com"
                                />
                                <Button
                                    onClick={handleEmail}
                                    loading={sendingEmail}
                                    disabled={!email}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    <Mail className="w-4 h-4 mr-2" />
                                    Send Email
                                </Button>
                            </div>
                        </div>

                        <Button variant="ghost" onClick={onClose} className="mt-auto">
                            Close
                        </Button>
                    </div>
                </div>
            </ModalBody>
        </Modal>
    );
}
