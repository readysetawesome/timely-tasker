import './App.css';
import { Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <header>
        Welcome to the Timely Tasker!  &nbsp; <a href="https://github.com/readysetawesome/timely-tasker">Timely Tasker Github Project</a>
      </header>
      <Outlet />
    </div>
  );
}

export default App;
