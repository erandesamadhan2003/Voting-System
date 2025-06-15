import { getProvider, getSigner } from "./../../utils/web3utils.js";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";


const initialState = {
    account: "",
    chainId: "",
    isConnected: false,
    isConnecting: false,
    error: null
}


export const connectWallet = createAsyncThunk("Web3/connectWallet", async (_, { rejectWithValue }) => {
    try {
        if (!window.ethereum) {
            console.error("MetaMask is not installed");
            return rejectWithValue("MetaMask is not installed");
        }

        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = getProvider();
        const signer = await getSigner();
        const accounts = await signer.getAddress();
        const { chainId } = await provider.getNetwork();

        return {
            account: accounts,
            chainId: chainId.toString(),
        };
    } catch (error) {
        console.error("Error connecting wallet:", error);
        return rejectWithValue(error.message);
    }
})

export const switchNetwork = createAsyncThunk("Web3/switchNetwork", async (chainId, { rejectWithValue }) => {
    try {
        if (!window.ethereum) {
            console.error("MetaMask is not installed");
            return rejectWithValue("MetaMask is not installed");
        }
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
        const provider = getProvider();
        const signer = await getSigner();
        const accounts = await signer.getAddress();
        const { chainId: currentChainId } = await provider.getNetwork();
        return {
            account: accounts,
            chainId: currentChainId,
        };
    } catch (error) {
        console.error("Error switching network:", error);
        return rejectWithValue(error.message);
    }
});

const connectionSlice = createSlice({
    name: "connection",
    initialState,
    reducers: {
        disconnectWallet: (state) => {
            state.account = "";
            state.chainId = "";
            state.isConnected = false;
            state.isConnecting = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(connectWallet.pending, (state) => {
                state.isConnecting = true;
                state.error = null;
            })
            .addCase(connectWallet.fulfilled, (state, action) => {
                state.account = action.payload.account;
                state.chainId = action.payload.chainId;
                state.isConnected = true;
                state.isConnecting = false;
                state.error = null;
            })
            .addCase(connectWallet.rejected, (state, action) => {
                state.isConnecting = false;
                state.error = action.payload ?? "Failed to connect wallet.";
            })
            .addCase(switchNetwork.fulfilled, (state, action) => {
                state.chainId = action.payload;
            })
            .addCase(switchNetwork.rejected, (state, action) => {
                state.error = action.payload ?? "Failed to switch network.";
            });
    }
});

export const { disconnectWallet } = connectionSlice.actions;
export default connectionSlice.reducer;