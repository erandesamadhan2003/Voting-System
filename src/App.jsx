// src/App.jsx
import React from 'react';
import './App.css';
import { useDispatch, useSelector } from 'react-redux';
import { connectWallet } from './features/connection/connectionSlice.js';
import { getOwner } from './utils/web3utils.js';
import { getContract } from './utils/web3utils';
import { checkUserRole, checkVotingStatus } from './features/authentication/authenticationSlice';
import { fetchElectionStatus } from './features/Election/electionSlice';

function App() {
    const dispatch = useDispatch();
    const { account, isConnected, isConnecting, error } = useSelector(state => state.connection);
    const { electionState, totalCandidates, totalVotes, totalVoters} = useSelector(state => state.election);
    const { candidates, candidateIds } = useSelector(state => state.candidate)
    const candidateData = {
        name: "samadhan Erande",
        party: "BlockChain Developer"
    }
    const handleConnect = async () => {
        dispatch(connectWallet());
        if (!account) return;
        dispatch(checkUserRole(account));
        dispatch(checkVotingStatus(account));
    }
    const fetchElectionState = async () => {
        try {
            const contract = await getContract();
            const owner = await getOwner();
            const state = await contract.electionState();
            console.log(state);
            dispatch(fetchElectionStatus());
        } catch (err) {
            console.error("Error fetching election state:", err);
        }
    };

    const getVoterInfo = async () => {

    }

    return (
        <div>
            <button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
            {account && <p>Account: {account}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {isConnected && <button onClick={fetchElectionState}>Check Election State</button>}
            <br />
            { account && 
                <button onClick={getVoterInfo}>
                    getVoter
                </button>
            }
        </div>
    );
}

export default App;
