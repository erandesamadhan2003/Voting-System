import {configureStore} from '@reduxjs/toolkit';
import connectionReducer from '../features/connection/connectionSlice.js';
import authenticationReducer from '../features/authentication/authenticationSlice.js';
import electionReducer from '../features/Election/electionSlice.js';
import candidateReducer from '../features/candidate/candidateSlice.js';
import votersReducer from '../features/voters/voterSlice.js';
import votingReducer from '../features/voting/votingSlice.js';
import resultReducer from '../features/result/resultSlice.js';
export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    authenctication: authenticationReducer,
    election: electionReducer,
    candidate: candidateReducer,
    voters: votersReducer,
    voting: votingReducer,
    result: resultReducer,
  },
});