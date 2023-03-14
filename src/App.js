import './App.css';
import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <header>
        Welcome to the Timely Tasker!
      </header>
      <Outlet />
    </div>
  );
}

export default App;
