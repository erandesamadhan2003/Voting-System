import { getContract } from '@/utils/web3utils';
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';

const initialState = {
    results: [],
    winner: null,
    totalVotes: 0,
    isLoading: false,
    error: null,
}

export const fetchResult = createAsyncThunk('result/fetchResults', async (_, {rejectWithValue}) => {
    try {
        const contract = await getContract();
        const results = await contract.getResults();
        return results;
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

export const fetchWinner = createAsyncThunk('result/fetchWinner', async (_, {rejectWithValue}) => {
    try {
        const contract = await getContract();
        const winner = await contract.getWinner();
        return winner;
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

export const fetchLiveResults = createAsyncThunk('result/fetchLiveResults', async (_, {rejectWithValue}) => {
    try {
        const contract = await getContract();
        const results = await contract.getElectionStatus();
        return results.totalVotes;
    } catch (error) {
        return rejectWithValue(error.message);
    }
});

const resultSlice = createSlice({
    name: 'result',
    initialState,
    reducers: {
        setResults: (state, action) => {
            state.results = action.payload;
        },
        setWinner: (state, action) => { 
            state.winner = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchResult.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchResult.fulfilled, (state, action) => {
                state.isLoading = false;
                state.results = action.payload;
            })
            .addCase(fetchResult.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchWinner.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchWinner.fulfilled, (state, action) => {
                state.isLoading = false;
                state.winner = action.payload;
            })
            .addCase(fetchWinner.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchLiveResults.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchLiveResults.fulfilled, (state, action) => {
                state.isLoading = false;
                state.totalVotes = action.payload;
            })
            .addCase(fetchLiveResults.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    }
}); 

export const { setResults, setWinner } = resultSlice.actions;
export default resultSlice.reducer;