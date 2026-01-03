import { useState } from 'react';

export function Tabs({ tabs, defaultTab, onChange }) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        onChange?.(tabId);
    };

    return (
        <div className="w-full overflow-x-auto pb-1">
            <div className="flex items-center gap-1 p-1 bg-dark-tertiary rounded-lg min-w-max">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 whitespace-nowrap shrink-0
            ${activeTab === tab.id
                                ? 'bg-accent-primary text-white shadow-lg'
                                : 'text-zinc-400 hover:text-white hover:bg-dark-secondary'
                            }
          `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function TabsContainer({ children }) {
    return <div className="space-y-4">{children}</div>;
}

export function TabPanel({ children, isActive }) {
    if (!isActive) return null;
    return <div className="animate-fade-in">{children}</div>;
}
