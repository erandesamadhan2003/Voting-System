import './App.css'
import { getContract, getProvider } from './utils/etherutils';
import React, { useState } from 'react';
function App() {
  const [account, setAccount] = useState("");

  const connectWallet = async () => {
    const provider = getProvider();
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    setAccount(address);
    console.log("Connected Account:", address);
  };

  const fetchElectionState = async () => {
    const contract = await getContract();
    const state = await contract.electionState();
    console.log("Election State:", state);
  };

  return (
    <div>
      <button onClick={connectWallet}>Connect Wallet</button>
      <p>Account: {account}</p>
      <button onClick={fetchElectionState}>Check Election State</button>
    </div>
  );
}

export default App
