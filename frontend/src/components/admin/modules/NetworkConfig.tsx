import { useState, useEffect } from 'react';
import { Server, Activity, Network, Box } from 'lucide-react';
import { getNetworkHealth } from '../../../services/api';

interface NetworkHealth {
    status: string;
    block_height: number;
    peers: string[];
    orderers: string[];
    chaincode: string;
    uptime: string;
}

export default function NetworkConfig() {
    const [health, setHealth] = useState<NetworkHealth | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getNetworkHealth().then(data => {
            setHealth({
                ...data,
                chaincode: data.chaincode || "asset-transfer",
                uptime: data.uptime || "99.9%"
            });
        })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading || !health) return <div className="p-10 text-center text-slate-500">Loading Network Status...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Network className="text-blue-400" /> Network Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Health Card */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Activity size={20} className="text-green-400" /> Health Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-400">Overall Status</span>
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                                {health.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-400">Uptime</span>
                            <span className="text-white font-mono">{health.uptime}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-400">Block Height</span>
                            <span className="text-blue-400 font-mono font-bold flex items-center gap-2">
                                <Box size={14} /> {health.block_height}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                            <span className="text-slate-400">Chaincode ID</span>
                            <span className="text-white font-mono text-sm">{health.chaincode}</span>
                        </div>
                    </div>
                </div>

                {/* Nodes Card */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Server size={20} className="text-blue-400" /> Toplogy
                    </h3>
                    <div className="space-y-3">
                        <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-2">Peers</div>
                        {health.peers.map((peer: string) => (
                            <div key={peer} className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                {peer}
                            </div>
                        ))}

                        <div className="text-sm text-slate-400 uppercase font-bold tracking-wider mt-4 mb-2">Orderers</div>
                        {health.orderers.map((orderer: string) => (
                            <div key={orderer} className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                {orderer}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
