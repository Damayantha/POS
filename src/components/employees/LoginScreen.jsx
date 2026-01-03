import { useState, useEffect } from 'react';
import { PinPad } from '../ui/NumPad';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../ui/Toast';
import { TitleBar } from '../layout/TitleBar';
import { Terminal } from 'lucide-react';

export default function LoginScreen() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuthStore();

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await window.electronAPI.employees.getAll();
            setEmployees(data.filter(e => e.is_active));
        } catch (error) {
            console.error('Failed to load employees:', error);
        }
    };

    const handleLogin = async (enteredPin) => {
        if (!selectedEmployee) return;

        setLoading(true);
        try {
            const result = await login(selectedEmployee.id, enteredPin);
            if (!result.success) {
                toast.error(result.error || 'Invalid PIN');
                setPin('');
            }
        } catch (error) {
            toast.error('Login failed');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    if (selectedEmployee) {
        return (
            <div className="h-screen w-screen flex flex-col bg-dark-primary">
                <TitleBar />
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-md">
                        {/* Back button */}
                        <button
                            onClick={() => {
                                setSelectedEmployee(null);
                                setPin('');
                            }}
                            className="mb-8 text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
                        >
                            ← Back to employees
                        </button>

                        {/* Selected employee */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">
                                    {selectedEmployee.name.charAt(0)}
                                </span>
                            </div>
                            <h2 className="text-xl font-semibold">{selectedEmployee.name}</h2>
                            <p className="text-zinc-500 capitalize">{selectedEmployee.role}</p>
                        </div>

                        {/* PIN Entry */}
                        <div className="card p-6">
                            <p className="text-center text-zinc-400 mb-6">Enter your PIN</p>
                            <PinPad
                                value={pin}
                                onChange={setPin}
                                onEnter={handleLogin}
                                pinLength={4}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-dark-primary">
            <TitleBar />
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="mb-12 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-white mx-auto mb-4 flex items-center justify-center shadow-lg shadow-white/10">
                        <Terminal size={40} className="text-black" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">POSbyCirvex</h1>
                    <p className="text-zinc-500">Select your profile to login</p>
                </div>

                {/* Employee Grid */}
                <div className="w-full max-w-2xl">
                    {employees.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-zinc-400 mb-2">No employees found</p>
                            <p className="text-zinc-500 text-sm">
                                Default admin PIN: 1234
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {employees.map(employee => (
                                <button
                                    key={employee.id}
                                    onClick={() => setSelectedEmployee(employee)}
                                    className="card p-6 text-center hover:border-accent-primary hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-dark-tertiary mx-auto mb-3 flex items-center justify-center group-hover:bg-accent-primary transition-colors">
                                        <span className="text-2xl font-semibold text-zinc-400 group-hover:text-white transition-colors">
                                            {employee.name.charAt(0)}
                                        </span>
                                    </div>
                                    <p className="font-medium truncate">{employee.name}</p>
                                    <p className="text-xs text-zinc-500 capitalize">{employee.role}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

