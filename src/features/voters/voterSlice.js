import { getContract } from "@/utils/web3utils";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
    voters: [],
    authorizeVoters: [],
    isLoading: false,
    error: null,
}

export const fetchVoters = createAsyncThunk('voters/fetchVoters', async (_, { rejectWithValue }) => {
    try {
        const contract = getContract();

        const electionStatus = await contract.getElectionStatus();
        const totalVoters = electionStatus.totalVoters.toNumber();

        if (totalVoters === 0) {
            return { voters: [], authorizeVoters: [] };
        }

        const voterAddresses = [];
        for (let i = 0; i < totalVoters; i++) {
            try {
                const voterAddress = await contract.voterList(i);
                voterAddresses.push(voterAddress);
            } catch (error) {
                console.log(`Error fetching voter at index ${i}:`, error);
            }
        }

        const votersPromises = voterAddresses.map(async (address) => {
            try {
                const voterInfo = await contract.getVoterInfo(address);
                return {
                    address: address.toLowerCase(),
                    isRegistered: voterInfo.isRegistered,
                    hasVoted: voterInfo.hasVoted,
                    votedCandidateId: voterInfo.votedCandidateId.toNumber(),
                    timestamp: voterInfo.timestamp.toNumber()
                };
            } catch (error) {
                console.warn(`Failed to get voter info for ${address}:`, error);
                return null;
            }
        });
        const votersResults = await Promise.all(votersPromises);
        const voters = votersResults.filter(voter => voter !== null);
        const authorizedVoters = voters
            .filter(voter => voter.isRegistered)
            .map(voter => voter.address);
        
        return { voters, authorizedVoters };
    } catch (error) {
        console.log(error);
        return rejectWithValue(error.message);
    }
})


export const authorizeVoter = createAsyncThunk(
    'voters/authorizeVoter',
    async (voterAddress, { rejectWithValue, getState }) => {
        try {
            const validationError = validateVoterAddress(voterAddress);
            if (validationError) {
                return rejectWithValue(validationError);
            }
            
            const state = getState();
            const normalizedAddress = voterAddress.toLowerCase();
            const isAlreadyAuthorized = state.voters.authorizedVoters.includes(normalizedAddress);
            
            if (isAlreadyAuthorized) {
                return rejectWithValue("Voter is already authorized");
            }
            
            const contract = getContract();
            const tx = await contract.authorizeVoter(voterAddress);
            const receipt = await tx.wait();
            
            const event = receipt.events?.find(e => e.event === 'VoterAuthorized');
            if (!event) {
                throw new Error("Authorization event not found in transaction receipt");
            }
            
            return {
                address: normalizedAddress,
                isRegistered: true,
                hasVoted: false,
                votedCandidateId: 0,
                timestamp: 0
            };
        } catch (error) {
            console.error("Error authorizing voter:", error);
            return rejectWithValue(error.message || "Failed to authorize voter");
        }
    }
);


export const batchAuthorizeVoters = createAsyncThunk(
    'voters/batchAuthorizeVoters',
    async (voterAddresses, { rejectWithValue, getState, dispatch }) => {
        try {
            // Validate addresses array
            const validationError = validateVoterAddresses(voterAddresses);
            if (validationError) {
                return rejectWithValue(validationError);
            }
            
            // Check for already authorized voters
            const state = getState();
            const normalizedAddresses = voterAddresses.map(addr => addr.toLowerCase());
            const alreadyAuthorized = normalizedAddresses.filter(addr => 
                state.voters.authorizedVoters.includes(addr)
            );
            
            if (alreadyAuthorized.length > 0) {
                return rejectWithValue(
                    `The following addresses are already authorized: ${alreadyAuthorized.join(', ')}`
                );
            }
            
            const contract = getContract();
            const results = [];
            const errors = [];
            
            // Process each address
            for (let i = 0; i < voterAddresses.length; i++) {
                try {
                    const address = voterAddresses[i];
                    const tx = await contract.authorizeVoter(address);
                    await tx.wait();
                    
                    results.push({
                        address: address.toLowerCase(),
                        isRegistered: true,
                        hasVoted: false,
                        votedCandidateId: 0,
                        timestamp: 0
                    });
                } catch (error) {
                    console.error(`Error authorizing voter ${voterAddresses[i]}:`, error);
                    errors.push({
                        address: voterAddresses[i],
                        error: error.message
                    });
                }
            }
            
            if (errors.length > 0 && results.length === 0) {
                return rejectWithValue(`Failed to authorize any voters. Errors: ${errors.map(e => e.error).join(', ')}`);
            }
            
            return {
                successful: results,
                errors: errors,
                message: `Successfully authorized ${results.length} out of ${voterAddresses.length} voters`
            };
        } catch (error) {
            console.error("Error in batch authorize voters:", error);
            return rejectWithValue(error.message || "Failed to batch authorize voters");
        }
    }
);



export const fetchVoterDetails = createAsyncThunk(
    'voters/fetchVoterDetails',
    async (voterAddress, { rejectWithValue }) => {
        try {
            const validationError = validateVoterAddress(voterAddress);
            if (validationError) {
                return rejectWithValue(validationError);
            }
            
            const contract = getContract();
            const voterInfo = await contract.getVoterInfo(voterAddress);
            
            return {
                address: voterAddress.toLowerCase(),
                isRegistered: voterInfo.isRegistered,
                hasVoted: voterInfo.hasVoted,
                votedCandidateId: voterInfo.votedCandidateId.toNumber(),
                timestamp: voterInfo.timestamp.toNumber()
            };
        } catch (error) {
            console.error("Error fetching voter details:", error);
            return rejectWithValue(error.message || "Failed to fetch voter details");
        }
    }
);

const votersSlice = createSlice({
    name: 'voters',
    initialState,
    reducers: {
        setVoters: (state, action) => {
            state.voters = action.payload;
            state.authorizedVoters = action.payload
                .filter(voter => voter.isRegistered)
                .map(voter => voter.address);
        },
        addVoter: (state, action) => {
            const normalizedAddress = action.payload.address.toLowerCase();
            const existingIndex = state.voters.findIndex(v => v.address === normalizedAddress);
            
            if (existingIndex === -1) {
                state.voters.push(action.payload);
                if (action.payload.isRegistered && !state.authorizedVoters.includes(normalizedAddress)) {
                    state.authorizedVoters.push(normalizedAddress);
                }
            }
        },
        updateVoterStatus: (state, action) => {
            const { address, hasVoted, votedCandidateId, timestamp } = action.payload;
            const normalizedAddress = address.toLowerCase();
            const voter = state.voters.find(v => v.address === normalizedAddress);
            
            if (voter) {
                voter.hasVoted = hasVoted;
                voter.votedCandidateId = votedCandidateId;
                voter.timestamp = timestamp;
            }
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchVoters.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVoters.fulfilled, (state, action) => {
                state.isLoading = false;
                state.voters = action.payload.voters;
                state.authorizedVoters = action.payload.authorizedVoters;
            })
            .addCase(fetchVoters.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Authorize single voter
            .addCase(authorizeVoter.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(authorizeVoter.fulfilled, (state, action) => {
                state.isLoading = false;
                state.voters.push(action.payload);
                state.authorizedVoters.push(action.payload.address);
            })
            .addCase(authorizeVoter.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(batchAuthorizeVoters.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(batchAuthorizeVoters.fulfilled, (state, action) => {
                state.isLoading = false;
                action.payload.successful.forEach(voter => {
                    state.voters.push(voter);
                    state.authorizedVoters.push(voter.address);
                });
                if (action.payload.errors.length > 0) {
                    state.error = action.payload.message;
                }
            })
            .addCase(batchAuthorizeVoters.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Fetch voter details
            .addCase(fetchVoterDetails.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVoterDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                const existingIndex = state.voters.findIndex(v => v.address === action.payload.address);
                if (existingIndex !== -1) {
                    state.voters[existingIndex] = action.payload;
                } else {
                    state.voters.push(action.payload);
                }
                
                if (action.payload.isRegistered && !state.authorizedVoters.includes(action.payload.address)) {
                    state.authorizedVoters.push(action.payload.address);
                }
            })
            .addCase(fetchVoterDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    }
});


export const { setVoters, addVoter, updateVoterStatus, clearError } = votersSlice.actions;
export default votersSlice.reducer;