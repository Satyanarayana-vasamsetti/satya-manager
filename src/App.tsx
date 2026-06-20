import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Calendar } from './pages/Calendar';
import { AddBooking } from './pages/AddBooking';
import { Clients } from './pages/Clients';
import { More } from './pages/More';
import { Leads } from './pages/Leads';
import { Payments } from './pages/Payments';
import { Tasks } from './pages/Tasks';
import { Analytics } from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/add-booking" element={<AddBooking />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/more" element={<More />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
