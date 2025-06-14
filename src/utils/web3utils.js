import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '../contracts/config.js';
import VotingSystemABI from '../contracts/VotingSystem.json';

export const getProvider = () => {
    let provider;
    if (!window.ethereum) {
        console.log("MetaMask not installed; using read-only defaults")
        provider = ethers.getDefaultProvider()
        return provider;
    } else {
        provider = new ethers.BrowserProvider(window.ethereum)
    }
    return provider;
    
}

export const getSigner = async () => {
    const provider = getProvider();
    const signer = await provider.getSigner();
    return signer;
};

export const getContract = async () => {
  const signer = await getSigner(); 
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, signer);
};

export const getReadOnlyContract = () => {
  const provider = getProvider(); 
  return new ethers.Contract(CONTRACT_ADDRESS, VotingSystemABI.abi, provider);
};

export const getOwner = async () => {
  const contract = await getContract();
  const owner = await contract.owner();
  return owner;
}