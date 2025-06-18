import {configureStore} from '@reduxjs/toolkit';
import connectionReducer from '../features/connection/connectionSlice.js';
import authenticationReducer from '../features/authentication/authenticationSlice.js';
import electionReducer from '../features/Election/electionSlice.js';

export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    authenctication: authenticationReducer,
    election: electionReducer
  },
});