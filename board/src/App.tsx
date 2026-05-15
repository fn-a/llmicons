import { useMemo, useState } from 'react';
import { Icon, addCollection } from '@iconify/react';
import { icons as lobeIcons, info as lobeInfo } from '@llmicons-json/lobe';
import { icons as mdevIcons, info as mdevInfo } from '@llmicons-json/mdev';
// import lobeIcons from '@llmicons-json/lobe/icons.json';
// import lobeInfo from '@llmicons-json/lobe/info.json';
// import mdevIcons from '@llmicons-json/mdev/icons.json';
// import mdevInfo from '@llmicons-json/mdev/info.json';

// Register custom collections with Iconify
addCollection(lobeIcons);
addCollection(mdevIcons);

interface IconEntry {
    name: string;
    prefix: string;
    collection: string;
}

function App() {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'lobe' | 'mdev'>('all');

    const allIcons = useMemo<IconEntry[]>(() => {
        const entries: IconEntry[] = [];

        for (const name of Object.keys(lobeIcons.icons)) {
            entries.push({ name, prefix: 'lobe', collection: 'Lobe Icons' });
        }
        for (const name of Object.keys(mdevIcons.icons)) {
            entries.push({ name, prefix: 'mdev', collection: 'Models.dev' });
        }

        return entries;
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        let list = allIcons;

        if (activeTab !== 'all') {
            list = list.filter((i) => i.prefix === activeTab);
        }

        if (!q) return list;

        return list.filter(
            (i) =>
                i.name.toLowerCase().includes(q) ||
                i.prefix.includes(q) ||
                i.collection.toLowerCase().includes(q),
        );
    }, [search, activeTab, allIcons]);

    const lobeCount = Object.keys(lobeIcons.icons).length;
    const mdevCount = Object.keys(mdevIcons.icons).length;

    return (
        <div className="app">
            <header className="header">
                <h1>LLM Icons</h1>
                <p className="subtitle">
                    Preview board for {lobeCount + mdevCount} icons across 2 collections
                </p>
            </header>

            <div className="controls">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search icons by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    {search && (
                        <button className="clear-btn" onClick={() => setSearch('')}>
                            ✕
                        </button>
                    )}
                </div>

                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        All
                        <span className="badge">{lobeCount + mdevCount}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'lobe' ? 'active' : ''}`}
                        onClick={() => setActiveTab('lobe')}
                    >
                        Lobe
                        <span className="badge">{lobeCount}</span>
                    </button>
                    <button
                        className={`tab ${activeTab === 'mdev' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mdev')}
                    >
                        Models.dev
                        <span className="badge">{mdevCount}</span>
                    </button>
                </div>
            </div>

            <div className="stats">
                Showing {filtered.length} of {activeTab === 'all' ? allIcons.length : (activeTab === 'lobe' ? lobeCount : mdevCount)} icons
            </div>

            <div className="grid">
                {filtered.map((icon) => (
                    <div key={`${icon.prefix}:${icon.name}`} className="icon-card">
                        <div className="icon-preview">
                            <Icon icon={`${icon.prefix}:${icon.name}`} width={24} height={24} />
                        </div>
                        <div className="icon-name" title={icon.name}>
                            {icon.name}
                        </div>
                        <div className="icon-prefix">{icon.prefix}</div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="empty">
                    <p>No icons found matching "{search}"</p>
                </div>
            )}

            <footer className="footer">
                <span>Lobe Icons v{lobeInfo.version}</span>
                <span>Models.dev Icons v{mdevInfo.version}</span>
            </footer>
        </div>
    );
}

export default App;