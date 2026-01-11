import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { SyncProvider } from '../sync/SyncProvider';
import AIAssistant from '../ai/AIAssistant';

export default function MainLayout({ children }) {
    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden">
            <SyncProvider />
            <TitleBar />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-hidden bg-dark-primary relative">
                    {children}
                    <AIAssistant />
                </main>
            </div>
        </div>
    );
}

