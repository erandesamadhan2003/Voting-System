import {configureStore} from '@reduxjs/toolkit';
import connectionReducer from '../features/connection/connectionSlice.js';
export const store = configureStore({
  reducer: {
    connection: connectionReducer,
  },
});