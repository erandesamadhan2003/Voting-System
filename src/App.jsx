// src/App.jsx
import React from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';
import { connectWallet } from './features/connection/connectionSlice.js';
import { getContract } from './utils/web3utils.js';

function App() {
    const dispatch = useDispatch();
    const { account, isConnected, isConnecting, error } = useSelector(state => state.connection);

    const handleConnect = () => dispatch(connectWallet());

    const fetchElectionState = async () => {
        try {
            const contract = await getContract();
            const state = await contract.electionState();
            console.log("Election State:", state);
        } catch (err) {
            console.error("Error fetching election state:", err);
        }
    };

    return (
        <div>
            <button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {account && <p>Account: {account}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {isConnected && <button onClick={fetchElectionState}>Check Election State</button>}
        </div>
    );
}

export default App;
