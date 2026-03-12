import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import App from './App';
import MonthView from './components/MonthView/MonthView';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import storeMaker from './store';
import { Provider } from 'react-redux';
const root = ReactDOM.createRoot(document.getElementById('root') as Element);

root.render(
  <Provider store={storeMaker()}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}></Route>
        <Route path="timer" element={<App />} />
        <Route path="month" element={<MonthView />} />
      </Routes>
    </BrowserRouter>
  </Provider>
);
