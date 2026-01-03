import { useState } from 'react';
import { X, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { auth } from '../../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { toast } from '../ui/Toast';

export function UpdateEmailModal({ isOpen, onClose, currentEmail }) {
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const user = auth.currentUser;

        if (!user) {
            setError('No active license session. Please restart the application.');
            setLoading(false);
            return;
        }

        try {
            // 1. Re-authenticate user
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            // 2. Send Verification Email to New Address
            // Firebase will update the email only AFTER the user clicks the link in the email.
            await verifyBeforeUpdateEmail(user, newEmail);

            setVerificationSent(true);
            toast.success('Verification email sent!');
        } catch (err) {
            console.error('Email update error:', err);
            if (err.code === 'auth/wrong-password') {
                setError('Incorrect password');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('This email is already in use by another account');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else if (err.code === 'auth/requires-recent-login') {
                setError('Please sign in again before updating your email');
            } else {
                setError('Failed to initiate update: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (verificationSent) {
        return (
            <div className="modal-overlay">
                <div className="modal-content max-w-md text-center p-8">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Verification Sent</h3>
                    <p className="text-zinc-400 mb-6">
                        We have sent a verification email to <span className="text-white font-medium">{newEmail}</span>.
                    </p>
                    <p className="text-zinc-500 text-sm mb-8">
                        Please click the link in that email to confirm the change.
                        Your email address will be updated automatically once verified.
                    </p>
                    <Button onClick={onClose} className="w-full">
                        Close
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content max-w-md">
                <div className="modal-header">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Mail className="w-5 h-5 text-accent-primary" />
                        Update License Email
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1">
                    <div className="modal-body space-y-4">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-200/90">
                                <p className="font-medium mb-1">Security Check Required</p>
                                <p className="text-xs opacity-80">
                                    Changing the license email is a sensitive action.
                                    Please enter your current password to confirm.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-zinc-500 mb-1">Current Email</label>
                                <div className="p-2.5 bg-dark-tertiary rounded-lg text-zinc-400 border border-zinc-800">
                                    {currentEmail}
                                </div>
                            </div>

                            <Input
                                label="New Email Address"
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="name@company.com"
                                icon={Mail}
                                required
                            />

                            <Input
                                label="Confirm Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your current password"
                                icon={Lock}
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" loading={loading} disabled={!newEmail || !password}>
                            Update Email
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
