import { getContract } from "@/utils/web3utils";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";


const initialState = {
    electionState: 'NotStarted',
    totalCandidates: 0,
    totalVotes: 0,
    totalVoters: 0,
    isLoading: false,
    error: null
}

const ElectionStateEnum = {
    0: 'NotStarted',
    1: 'Active',
    2: 'Ended',
};

export const fetchElectionStatus = createAsyncThunk(
    'election/fetchElectionStatus',
    async (_, { rejectWithValue }) => {
        try {
            const contract = await getContract();
            const electionStatus = await contract.getElectionStatus();

            const electionStateIndex = Number(electionStatus[0]); 
            const totalCandidates = Number(electionStatus[1]);
            const totalVotes = Number(electionStatus[2]);
            const totalVoters = Number(electionStatus[3]);

            const electionState = ElectionStateEnum[electionStateIndex];
            console.log("Election state:", electionState);

            return {
                electionState,
                totalCandidates,
                totalVotes,
                totalVoters,
            };
        } catch (error) {
            console.error("Error fetching election status:", error);
            return rejectWithValue(error.message);
        }
    }
);


export const startElection = createAsyncThunk('election/startElection', async (_, { rejectWithValue }) => {
    try {
        const contract = getContract();
        const tx = await contract.startElection();
        await tx.wait();
        return {
            electionState: 'Active'
        }
    } catch (error) {

    }
});

export const endElection = createAsyncThunk('election/endElection', async (_, { rejectWithValue }) => {
    try {
        const contract = getContract();
        const tx = await contract.endElection();
        await tx.wait();
        return {
            electionState: 'Ended'
        }
    } catch (error) {
        console.error("Error ending election:", error);
        return rejectWithValue(error.message);
    }
});

const electionSlice = createSlice({
    name: 'election',
    initialState,
    reducers: {
        setElectionState: (state, action) => {
            state.electionState = action.payload;
        },
        updateElectionStats: (state, action) => {
            state.totalCandidates = action.payload.totalCandidates;
            state.totalVotes = action.payload.totalVotes;
            state.totalVoters = action.payload.totalVoters;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchElectionStatus.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchElectionStatus.fulfilled, (state, action) => {
                state.isLoading = false;
                state.electionState = action.payload.electionState;
                state.totalCandidates = action.payload.totalCandidates;
                state.totalVotes = action.payload.totalVotes;
                state.totalVoters = action.payload.totalVoters;
            })
            .addCase(fetchElectionStatus.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || "Failed to fetch election status";
            })
            .addCase(startElection.fulfilled, (state, action) => {
                state.electionState = action.payload.electionState;
            })
            .addCase(endElection.fulfilled, (state, action) => {
                state.electionState = action.payload.electionState;
            });
    }
});

export const { setElectionState, updateElectionStats } = electionSlice.actions;
export default electionSlice.reducer;