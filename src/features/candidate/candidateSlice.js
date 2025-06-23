import { getContract } from "@/utils/web3utils";
import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";

const initialState = {
    candidates: [],
    candidateIds: [],
    isLoading: false,
    error: null
};

const validateCandidateData = (candidateData) => {
    if (!candidateData.name || candidateData.name.trim().length === 0) {
        return "Candidate name is required";
    }
    if (!candidateData.party || candidateData.party.trim().length === 0) {
        return "Party name is required";
    }
    if (!candidateData.description || candidateData.description.trim().length === 0) {
        return "Description is required";
    }
    if (candidateData.name.trim().length < 2) {
        return "Candidate name must be at least 2 characters long";
    }
    if (candidateData.party.trim().length < 2) {
        return "Party name must be at least 2 characters long";
    }
    if (candidateData.description.trim().length < 10) {
        return "Description must be at least 10 characters long";
    }
    return null;
};

export const fetchCandidates = createAsyncThunk(
    'candidates/fetchCandidates',
    async (_, { rejectWithValue }) => {
        try {
            const contract = getContract();
            const candidateIds = await contract.getAllCandidateIds();
            
            const candidatesPromises = candidateIds.map(async (id) => {
                const candidate = await contract.getCandidate(id.toNumber());
                return {
                    id: candidate.id.toNumber(),
                    name: candidate.name,
                    party: candidate.party,
                    description: candidate.description,
                    votes: candidate.voteCount.toNumber()
                };
            });
            
            const candidates = await Promise.all(candidatesPromises);
            const ids = candidates.map(c => c.id);
            
            return { candidates, candidateIds: ids };
        } catch (error) {
            console.error("Error fetching candidates:", error);
            return rejectWithValue(error.message || "Failed to fetch candidates");
        }
    }
);

export const registerCandidate = createAsyncThunk(
    'candidates/registerCandidate',
    async (candidateData, { rejectWithValue, getState }) => {
        try {
            const validationError = validateCandidateData(candidateData);
            if (validationError) {
                return rejectWithValue(validationError);
            }

            const state = getState();
            const existingCandidate = state.candidates.candidates.find(
                c => c.name.toLowerCase().trim() === candidateData.name.toLowerCase().trim()
            );
            if (existingCandidate) {
                return rejectWithValue("A candidate with this name already exists");
            }

            const contract = getContract();
            const tx = await contract.registerCandidate(
                candidateData.name.trim(),
                candidateData.party.trim(),
                candidateData.description.trim()
            );
            const receipt = await tx.wait();

            const event = receipt.events?.find((e) => e.event === 'CandidateRegistered');
            const candidateId = event?.args?.candidateId?.toNumber();

            if (!candidateId) {
                throw new Error("Failed to get candidate ID from transaction");
            }

            return {
                id: candidateId,
                name: candidateData.name.trim(),
                party: candidateData.party.trim(),
                description: candidateData.description.trim(),
                votes: 0
            };
        } catch (error) {
            console.error("Error registering candidate:", error);
            return rejectWithValue(error.message || "Failed to register candidate");
        }
    }
);

export const fetchCandidateDetails = createAsyncThunk(
    'candidates/fetchCandidateDetails',
    async (candidateId, { rejectWithValue }) => {
        try {
            if (!candidateId || candidateId <= 0) {
                return rejectWithValue("Invalid candidate ID");
            }

            const contract = getContract();
            const candidate = await contract.getCandidate(candidateId);
            
            return {
                id: candidate.id.toNumber(),
                name: candidate.name,
                party: candidate.party,
                description: candidate.description,
                votes: candidate.voteCount.toNumber()
            };
        } catch (error) {
            console.error("Error fetching candidate details:", error);
            return rejectWithValue(error.message || "Failed to fetch candidate details");
        }
    }
);

const candidatesSlice = createSlice({
    name: 'candidates',
    initialState,
    reducers: {
        setCandidates: (state, action) => {
            state.candidates = action.payload;
            state.candidateIds = action.payload.map(c => c.id);
        },
        addCandidate: (state, action) => {
            const exists = state.candidates.find(c => c.id === action.payload.id);
            if (!exists) {
                state.candidates.push(action.payload);
                state.candidateIds.push(action.payload.id);
            }
        },
        updateCandidateVotes: (state, action) => {
            const candidate = state.candidates.find(c => c.id === action.payload.id);
            if (candidate) {
                candidate.votes = action.payload.votes;
            }
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCandidates.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCandidates.fulfilled, (state, action) => {
                state.isLoading = false;
                state.candidates = action.payload.candidates;
                state.candidateIds = action.payload.candidateIds;
            })
            .addCase(fetchCandidates.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(registerCandidate.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerCandidate.fulfilled, (state, action) => {
                state.isLoading = false;
                state.candidates.push(action.payload);
                state.candidateIds.push(action.payload.id);
            })
            .addCase(registerCandidate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchCandidateDetails.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCandidateDetails.fulfilled, (state, action) => {
                const index = state.candidates.findIndex(c => c.id === action.payload.id);
                if (index !== -1) {
                    state.candidates[index] = action.payload;
                } else {
                    state.candidates.push(action.payload);
                    state.candidateIds.push(action.payload.id);
                }
                state.isLoading = false;
            })
            .addCase(fetchCandidateDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    }
});

const selectCandidatesState = (state) => state.candidates;

export const selectAllCandidates = createSelector(
    [selectCandidatesState],
    (candidatesState) => candidatesState.candidates
);

export const selectCandidateIds = createSelector(
    [selectCandidatesState],
    (candidatesState) => candidatesState.candidateIds
);

export const selectCandidatesLoading = createSelector(
    [selectCandidatesState],
    (candidatesState) => candidatesState.isLoading
);

export const selectCandidatesError = createSelector(
    [selectCandidatesState],
    (candidatesState) => candidatesState.error
);

export const selectCandidateById = createSelector(
    [selectAllCandidates, (state, candidateId) => candidateId],
    (candidates, candidateId) => candidates.find(c => c.id === candidateId) || null
);

export const selectCandidatesByParty = createSelector(
    [selectAllCandidates, (state, party) => party],
    (candidates, party) => candidates.filter(c => 
        c.party.toLowerCase().includes(party.toLowerCase())
    )
);

export const selectCandidatesSortedByVotes = createSelector(
    [selectAllCandidates],
    (candidates) => [...candidates].sort((a, b) => b.votes - a.votes)
);

export const selectCandidatesSortedByName = createSelector(
    [selectAllCandidates],
    (candidates) => [...candidates].sort((a, b) => a.name.localeCompare(b.name))
);

export const selectTopCandidates = createSelector(
    [selectCandidatesSortedByVotes, (state, limit) => limit],
    (sortedCandidates, limit) => sortedCandidates.slice(0, limit)
);

export const selectPartiesWithCandidates = createSelector(
    [selectAllCandidates],
    (candidates) => {
        const parties = new Set(candidates.map(c => c.party));
        return Array.from(parties).sort();
    }
);

export const selectCandidatesCount = createSelector(
    [selectAllCandidates],
    (candidates) => candidates.length
);

export const selectTotalVotes = createSelector(
    [selectAllCandidates],
    (candidates) => candidates.reduce((total, c) => total + c.votes, 0)
);

export const selectCandidateWithMostVotes = createSelector(
    [selectCandidatesSortedByVotes],
    (sortedCandidates) => sortedCandidates[0] || null
);

export const { setCandidates, addCandidate, updateCandidateVotes, clearError } = candidatesSlice.actions;
export default candidatesSlice.reducer;