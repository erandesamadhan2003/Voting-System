import { getOwner, getVoterInfo } from "@/utils/web3utils";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState = {
    isOwner: false,
    isRegisteredVoter: false,
    hasVoted: false,
    userRole: "",
    votedCandidateId: 0,
    isLoading: false,
    error: null
}

export const checkUserRole = createAsyncThunk("authentication/checkUserRole", async (address, { rejectWithValue }) => {
    try {
        const owner = await getOwner();
        const voter = await getVoterInfo(address);

        if( owner == address ) {
            return {
                isOwner: true, 
                isRegisteredVoter: false, 
                hasVoted: false, 
                userRole: "owner"
            };
        } 
        return {
            isOwner: false,
            isRegisteredVoter: voter.isRegistered,
            hasVoted: voter.hasVoted,
            userRole: voter.isRegistered ? "voter" : "guest"
        }
        
    } catch (error) {
        console.error("Error checkin user role:", error);
        return rejectWithValue(error.message);
    }
});

export const checkVotingStatus = createAsyncThunk("authentication/checkVotingStatus", async (address, { rejectWithValue }) => {
    try {
        const voter = await getVoterInfo(address);
        return {
            hasVoted: voter.hasVoted,
            votedCandidateId: Number(voter.votedCandidateId),
            isRegistered: voter.isRegistered
        };
    } catch (error) {
        console.error("Error checking voting status:", error);
        return rejectWithValue(error.message);
    }
});

const authenticationSlice = createSlice({
    name: "authentication",
    initialState,
    reducers: {
        resetAuthenticationState: (state) => {
            state.isOwner = false;
            state.isRegisteredVoter = false;
            state.hasVoted = false;
            state.userRole = "";
            state.votedCandidateId = 0;
            state.isLoading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder.addCase(checkUserRole.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        }).addCase(checkUserRole.fulfilled, (state, action) => {
            state.isOwner = action.payload.isOwner;
            state.isRegisteredVoter = action.payload.isRegisteredVoter;
            state.hasVoted = action.payload.hasVoted;
            state.userRole = action.payload.userRole;
            state.isLoading = false;
        }).addCase(checkUserRole.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload || "Failed to check user role";
        }).addCase(checkVotingStatus.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        }
        ).addCase(checkVotingStatus.fulfilled, (state, action) => {
            state.hasVoted = action.payload.hasVoted;
            state.votedCandidateId = action.payload.votedCandidateId;
            state.isRegisteredVoter = action.payload.isRegistered;
            state.isLoading = false;
        }).addCase(checkVotingStatus.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload || "Failed to check voting status";
        });
    }
});

export const { resetAuthenticationState } = authenticationSlice.actions;
export default authenticationSlice.reducer;

