import { getContract } from '@/utils/web3utils';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const initialState = {
    myVote: null,
    votingInProgress: false,
    voteReceipt: null,
    error: null,
}

export const castVote = createAsyncThunk('voting/castVote', async (candidateId, { rejectWithValue }) => {
    try {
        const contract = await getContract();
        const tx = await contract.vote(candidateId);
        const receipt = await tx.wait();
        return receipt;
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

export const fetchMyVote = createAsyncThunk('voting/fetchMyVote', async ( _, { rejectWithValue }) => {
    try {
        const contract = await getContract();
        const tx = await contract.getMyVote();
        const vote = await tx.wait();
        return vote;
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

export const verifyVote = createAsyncThunk('voting/verifyVote', async (verifyData, { rejectWithValue }) => {
    try {
        const { transactionHash, provider } = verifyData;
        const receipt = await provider.getTransactionReceipt(transactionHash);
        return receipt;
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

const votingSlice = createSlice({
    name: 'voting',
    initialState,
    reducers: {
        setMyVote: (state, action) => {
            state.myVote = action.payload;
        },
        setVotingProgress: (state, action) => {
            state.votingInProgress = action.payload;
        },
        setVoteReceipt: (state, action) => {
            state.voteReceipt = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(castVote.pending, (state) => {
                state.votingInProgress = true;
                state.error = null;
            })
            .addCase(castVote.fulfilled, (state, action) => {
                state.votingInProgress = false;
                state.voteReceipt = action.payload;
            })
            .addCase(castVote.rejected, (state, action) => {
                state.votingInProgress = false;
                state.error = action.payload;
            })
            .addCase(fetchMyVote.pending, (state) => {
                state.error = null;
            })
            .addCase(fetchMyVote.fulfilled, (state, action) => {
                state.myVote = action.payload;
            })
            .addCase(fetchMyVote.rejected, (state, action) => {
                state.error = action.payload;
            })
            // verifyVote
            .addCase(verifyVote.pending, (state) => {
                state.error = null;
            })
            .addCase(verifyVote.fulfilled, (state, action) => {
                state.voteReceipt = action.payload;
            })
            .addCase(verifyVote.rejected, (state, action) => {
                state.error = action.payload;
            });
    }
});

export const { setMyVote, setVotingProgress, setVoteReceipt, clearError } = votingSlice.actions;
export default votingSlice.reducer;