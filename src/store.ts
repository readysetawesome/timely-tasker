import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

import timer from './components/Timer/Timer.slice';

const reducer = combineReducers({
  timer,
});

const storeMaker = () => configureStore({ reducer });

export default storeMaker;
